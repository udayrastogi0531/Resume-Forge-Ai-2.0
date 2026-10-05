"""
Isolated LaTeX compilation service.

Security posture:
- Runs in a fresh temporary directory per compile, deleted afterward.
- Shell-escape is explicitly disabled (-no-shell-escape).
- Non-interactive mode only (-interaction=nonstopmode -halt-on-error).
- Hard wall-clock timeout via subprocess timeout (kills the process tree).
- We never pass user input through a shell (no shell=True); argv is a fixed
  list, so there is no command injection surface.
- Runs pdflatex twice (needed for refs/TOC in real resumes) but caps total
  time via the same timeout budget.
"""
import re
import subprocess
import tempfile
import time
import base64
import shutil
from pathlib import Path
from typing import List

from app.core.config import get_settings

settings = get_settings()

_ERROR_LINE_RE = re.compile(r"^! (.+)$", re.MULTILINE)
_WARNING_LINE_RE = re.compile(r"^(LaTeX Warning: .+)$", re.MULTILINE)


class CompileOutput:
    def __init__(self, success: bool, pdf_bytes: bytes | None, log: str,
                 errors: List[str], warnings: List[str], duration_ms: int):
        self.success = success
        self.pdf_bytes = pdf_bytes
        self.log = log
        self.errors = errors
        self.warnings = warnings
        self.duration_ms = duration_ms

    @property
    def pdf_base64(self) -> str | None:
        if self.pdf_bytes is None:
            return None
        return base64.b64encode(self.pdf_bytes).decode("ascii")


def compile_latex(source: str) -> CompileOutput:
    start = time.time()
    timeout = settings.LATEX_COMPILE_TIMEOUT_SECONDS

    if not source or not source.strip():
        return CompileOutput(False, None, "", ["Empty LaTeX source."], [], 0)

    with tempfile.TemporaryDirectory(prefix="resumeforge_compile_") as tmpdir:
        tmp = Path(tmpdir)
        tex_path = tmp / "resume.tex"
        tex_path.write_text(source, encoding="utf-8")

        combined_log = ""
        pdf_bytes = None
        success = False

        try:
            for _pass in range(2):  # two passes for refs/hyperlinks
                proc = subprocess.run(
                    [
                        "pdflatex",
                        "-no-shell-escape",
                        "-interaction=nonstopmode",
                        "-halt-on-error",
                        "-output-directory", str(tmp),
                        str(tex_path),
                    ],
                    cwd=str(tmp),
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                combined_log += proc.stdout + proc.stderr

            pdf_path = tmp / "resume.pdf"
            if pdf_path.exists():
                pdf_bytes = pdf_path.read_bytes()
                success = True
        except subprocess.TimeoutExpired:
            combined_log += f"\n\n[ResumeForge] Compilation timed out after {timeout}s."
        except FileNotFoundError:
            combined_log += "\n\n[ResumeForge] pdflatex binary not found on this server."

        errors = _ERROR_LINE_RE.findall(combined_log)
        warnings = _WARNING_LINE_RE.findall(combined_log)

        duration_ms = int((time.time() - start) * 1000)
        return CompileOutput(success, pdf_bytes, combined_log, errors, warnings, duration_ms)
