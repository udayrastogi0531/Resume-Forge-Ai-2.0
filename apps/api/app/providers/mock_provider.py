"""
MockProvider: a deterministic, offline stand-in for a real LLM.

This exists so the entire pipeline (JD extraction -> tailoring -> cover
letters) can be developed and tested end-to-end without any API key or
network access, and so CI/tests are fast and free. It never fabricates
resume content: it performs rule-based extraction/rewriting over the
literal input, exactly like the real prompts instruct a real LLM to do.

It inspects the *user_prompt* for a marker comment injected by the prompt
modules (e.g. "# TASK: jd_extraction") to decide which canned strategy to
run, then returns valid JSON matching the same contract the real
providers are instructed to return.
"""
import json
import re

from app.providers.base import AIProvider, AIResponse

COMMON_SKILLS = [
    "python", "javascript", "typescript", "react", "react.js", "node", "node.js",
    "sql", "postgresql", "mysql", "mongodb", "java", "c++", "go", "rust",
    "aws", "gcp", "azure", "docker", "kubernetes", "git", "ci/cd", "graphql",
    "rest", "html", "css", "tailwind", "next.js", "vue", "angular", "django",
    "flask", "fastapi", "spring", "pandas", "numpy", "tensorflow", "pytorch",
    "machine learning", "data analysis", "agile", "scrum", "leadership",
    "communication", "problem solving",
]

ALIASES = {
    "js": "javascript", "ts": "typescript", "react.js": "react",
    "reactjs": "react", "node.js": "node", "nodejs": "node",
    "postgres": "postgresql", "k8s": "kubernetes",
}


class MockProvider(AIProvider):
    name = "mock"

    def is_configured(self) -> bool:
        return True

    def complete(self, system_prompt: str, user_prompt: str, *, json_mode: bool = False) -> AIResponse:
        task = self._detect_task(system_prompt, user_prompt)
        if task == "jd_extraction":
            text = self._mock_jd_extraction(user_prompt)
        elif task == "resume_tailoring":
            text = self._mock_resume_tailoring(user_prompt)
        elif task == "cover_letter":
            text = self._mock_cover_letter(user_prompt)
        else:
            text = json.dumps({"note": "MockProvider: unrecognized task, returning empty object."})
        return AIResponse(text=text, provider=self.name, model="mock-rule-engine-v1")

    # ---- task routing ----
    def _detect_task(self, system_prompt: str, user_prompt: str) -> str:
        blob = (system_prompt + user_prompt).lower()
        if "task: jd_extraction" in blob:
            return "jd_extraction"
        if "task: resume_tailoring" in blob:
            return "resume_tailoring"
        if "task: cover_letter" in blob:
            return "cover_letter"
        return "unknown"

    # ---- JD extraction ----
    def _mock_jd_extraction(self, prompt: str) -> str:
        jd_text = self._extract_field(prompt, "JD_TEXT")
        lower = jd_text.lower()

        found = [s for s in COMMON_SKILLS if re.search(rf"(?<![a-z0-9]){re.escape(s)}(?![a-z0-9])", lower)]
        title_match = re.search(r"(?im)^(.*?(engineer|developer|designer|manager|analyst|scientist).*?)$", jd_text)
        title = title_match.group(1).strip()[:80] if title_match else "Unknown Title"

        company_match = re.search(r"(?im)^(?:company|about)\s*[:\-]\s*(.+)$", jd_text)
        company = company_match.group(1).strip() if company_match else None

        result = {
            "job_title": title,
            "company": company,
            "location": self._first_match(jd_text, r"(?im)location\s*[:\-]\s*(.+)"),
            "employment_type": self._first_match(jd_text, r"(?im)(full[- ]time|part[- ]time|contract|internship)"),
            "responsibilities": self._bullets_near(jd_text, ["responsibilities", "what you'll do", "duties"]),
            "required_skills": found[:8],
            "preferred_skills": found[8:12],
            "technical_skills": found,
            "soft_skills": [s for s in ["leadership", "communication", "problem solving"] if s in lower],
            "education_requirements": self._first_match(jd_text, r"(?im)(bachelor'?s|master'?s|phd|degree)[^\n]*"),
            "experience_requirements": self._first_match(jd_text, r"(?im)(\d+\+?\s*years?[^\n]*)"),
            "certifications": [],
            "keywords": found,
            "tools": [s for s in found if s in ["git", "docker", "kubernetes", "aws", "gcp", "azure"]],
            "programming_languages": [s for s in found if s in ["python", "javascript", "typescript", "java", "c++", "go", "rust"]],
            "frameworks": [s for s in found if s in ["react", "next.js", "vue", "angular", "django", "flask", "fastapi", "spring"]],
            "domain_terminology": [],
        }
        return json.dumps(result)

    # ---- Resume tailoring ----
    def _mock_resume_tailoring(self, prompt: str) -> str:
        latex = self._extract_field(prompt, "RESUME_LATEX")
        jd_json_raw = self._extract_field(prompt, "STRUCTURED_JD")
        try:
            jd = json.loads(jd_json_raw) if jd_json_raw else {}
        except json.JSONDecodeError:
            jd = {}

        required = set((jd.get("required_skills") or []) + (jd.get("keywords") or []))
        latex_lower = latex.lower()

        present = set()
        for skill in required:
            norm = ALIASES.get(skill, skill)
            if skill in latex_lower or norm in latex_lower:
                present.add(skill)
        missing = sorted(required - present)

        # Truthful, deterministic rewrite: only reword bullets that already
        # mention a required skill, to surface it more clearly. Never insert
        # a skill that isn't already present in the source.
        updated_latex = latex
        changes = []
        bullet_pattern = re.compile(r"(\\item\s+)([^\n\\]+)")

        def rewrite_bullet(match):
            prefix, content = match.group(1), match.group(2)
            for skill in present:
                if skill in content.lower() and not content.strip().endswith("."):
                    return match.group(0)
            return match.group(0)

        # Simple, truthful, visible change: bold present JD skills that already
        # occur in bullets, so the reviewer can see what was emphasized.
        def bold_skill(text_block: str) -> str:
            out = text_block
            for skill in sorted(present, key=len, reverse=True):
                pattern = re.compile(re.escape(skill), re.IGNORECASE)

                def _bolder(m):
                    return f"\\textbf{{{m.group(0)}}}"

                new_out, n = pattern.subn(_bolder, out, count=1)
                if n and "\\textbf{" not in out[:pattern.search(out).start()] if pattern.search(out) else False:
                    out = new_out
            return out

        if present:
            updated_latex = bold_skill(latex)
            changes.append({
                "type": "modified",
                "section": "experience/skills",
                "description": f"Emphasized {len(present)} skill(s) already present in the resume that match the JD: {', '.join(sorted(present))}.",
            })

        if missing:
            changes.append({
                "type": "flagged",
                "section": "skills",
                "description": f"{len(missing)} JD requirement(s) not found in the source resume were left out rather than invented: {', '.join(missing)}.",
            })

        result = {
            "updated_latex": updated_latex,
            "changes": changes,
            "matched_keywords": sorted(present),
            "missing_keywords": missing,
            "warnings": [] if present else ["No overlapping keywords were found between the resume and this JD."],
            "truthfulness_check": {"passed": True, "fabricated_claims": []},
        }
        return json.dumps(result)

    # ---- Cover letter ----
    def _mock_cover_letter(self, prompt: str) -> str:
        resume_text = self._extract_field(prompt, "RESUME_TEXT")
        jd_json_raw = self._extract_field(prompt, "STRUCTURED_JD")
        tone = self._extract_field(prompt, "TONE") or "professional"
        try:
            jd = json.loads(jd_json_raw) if jd_json_raw else {}
        except json.JSONDecodeError:
            jd = {}

        title = jd.get("job_title", "the role")
        company = jd.get("company") or "your team"
        skills = (jd.get("required_skills") or [])[:5]
        skills_str = ", ".join(skills) if skills else "the core requirements of this role"

        letter = (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my interest in the {title} position at {company}. "
            f"Having reviewed the role's requirements, I believe my background aligns well, "
            f"particularly around {skills_str}.\n\n"
            f"In my recent experience, I have worked directly with the technologies and "
            f"responsibilities this role calls for, and I am confident I can contribute "
            f"from day one. I value the opportunity to bring my existing skills to a team "
            f"that is solving problems I care about.\n\n"
            f"I would welcome the chance to discuss how my background can support your team's "
            f"goals. Thank you for your time and consideration.\n\n"
            f"Sincerely,\nCandidate"
        )
        return json.dumps({"cover_letter": letter, "tone": tone})

    # ---- helpers ----
    def _extract_field(self, prompt: str, field: str) -> str:
        pattern = re.compile(rf"<{field}>(.*?)</{field}>", re.DOTALL)
        m = pattern.search(prompt)
        return m.group(1).strip() if m else ""

    def _first_match(self, text: str, pattern: str):
        m = re.search(pattern, text)
        return m.group(0).strip() if m else None

    def _bullets_near(self, text: str, anchors):
        lines = text.splitlines()
        out = []
        capture = False
        for line in lines:
            low = line.lower()
            if any(a in low for a in anchors):
                capture = True
                continue
            if capture:
                if not line.strip():
                    if out:
                        break
                    continue
                out.append(line.strip("-•* \t"))
                if len(out) >= 8:
                    break
        return out
