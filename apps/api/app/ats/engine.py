"""
Deterministic ATS engine.

Per the product spec: the LLM must never alone decide the ATS score. This
module computes keyword coverage, skill coverage, and formatting checks
using plain string/regex logic, then produces a weighted score. AI
analysis (if used elsewhere) is a secondary signal only.
"""
import re
from dataclasses import dataclass, field

ALIASES = {
    "js": "javascript", "javascript": "javascript",
    "ts": "typescript", "typescript": "typescript",
    "react.js": "react", "reactjs": "react", "react": "react",
    "node.js": "node", "nodejs": "node", "node": "node",
    "postgres": "postgresql", "postgresql": "postgresql",
    "k8s": "kubernetes", "kubernetes": "kubernetes",
    "py": "python", "python": "python",
}

STANDARD_SECTIONS = ["experience", "education", "skills"]
CONTACT_PATTERNS = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),  # email
    re.compile(r"(\+?\d[\d\-\s().]{7,}\d)"),   # phone
]


@dataclass
class ATSCheck:
    label: str
    status: str  # PASS | WARNING | ERROR
    detail: str | None = None


@dataclass
class ATSResult:
    score: float
    breakdown: dict[str, float]
    checks: list[ATSCheck] = field(default_factory=list)
    matched_keywords: list[str] = field(default_factory=list)
    missing_keywords: list[str] = field(default_factory=list)


def normalize_term(term: str) -> str:
    t = term.strip().lower()
    t = re.sub(r"[^\w+.#-]", "", t)
    return ALIASES.get(t, t)


def latex_to_plain_text(latex: str) -> str:
    """Rough LaTeX -> plain text for keyword matching purposes (not for
    display). Strips comments and common commands while keeping their
    arguments' text."""
    text = re.sub(r"(?<!\\)%.*", "", latex)  # strip comments
    text = re.sub(r"\\(item|section\*?|textbf|textit|emph|hfill)\b", " ", text)
    text = re.sub(r"\\[a-zA-Z]+(\[[^\]]*\])?(\{([^{}]*)\})?", lambda m: m.group(3) or " ", text)
    text = re.sub(r"[{}\\]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def compute_keyword_coverage(resume_text: str, terms: list[str]) -> tuple[list[str], list[str]]:
    resume_norm = normalize_term(resume_text)  # not used directly; do per-word below
    lower_resume = resume_text.lower()
    resume_terms = {normalize_term(w) for w in re.findall(r"[A-Za-z][A-Za-z0-9+.#-]*", lower_resume)}

    matched, missing = [], []
    for term in terms:
        norm = normalize_term(term)
        if norm and (norm in resume_terms or term.lower() in lower_resume):
            matched.append(term)
        else:
            missing.append(term)
    return matched, missing


def run_formatting_checks(latex: str) -> list[ATSCheck]:
    checks = []
    plain = latex_to_plain_text(latex)

    # Contact info
    has_contact = any(p.search(plain) for p in CONTACT_PATTERNS)
    checks.append(ATSCheck("Contact information detected", "PASS" if has_contact else "ERROR",
                            None if has_contact else "No email or phone number found."))

    # Standard sections
    lower_latex = latex.lower()
    for section in STANDARD_SECTIONS:
        found = bool(re.search(rf"\\section\*?\{{[^}}]*{section}[^}}]*\}}", lower_latex)) or section in lower_latex
        checks.append(ATSCheck(f"{section.capitalize()} section detected", "PASS" if found else "WARNING",
                                None if found else f"No clear '{section}' section heading found."))

    # Multi-column layout (common ATS parsing hazard)
    multicol = bool(re.search(r"\\begin\{multicols\}|\\usepackage(\[[^\]]*\])?\{multicol\}|\\begin\{minipage\}.*\\begin\{minipage\}", latex, re.DOTALL))
    checks.append(ATSCheck("Single-column layout", "WARNING" if multicol else "PASS",
                            "Two/multi-column layout detected — some ATS parsers misread these." if multicol else None))

    # Tables
    has_table = bool(re.search(r"\\begin\{tabular\}|\\begin\{table\}", latex))
    checks.append(ATSCheck("No tables used", "WARNING" if has_table else "PASS",
                            "Tables can confuse ATS text extraction." if has_table else None))

    # Images/graphics
    has_image = bool(re.search(r"\\includegraphics", latex))
    checks.append(ATSCheck("No image-only content", "WARNING" if has_image else "PASS",
                            "Embedded images may not be read by ATS parsers." if has_image else None))

    # Headers/footers with critical info (fancyhdr usage as heuristic)
    uses_fancyhdr = "fancyhdr" in lower_latex
    checks.append(ATSCheck("No critical info in headers/footers", "WARNING" if uses_fancyhdr else "PASS",
                            "fancyhdr detected — verify no contact info lives only in a running header/footer." if uses_fancyhdr else None))

    # Length heuristic: count of \item or lines as a rough proxy
    approx_words = len(plain.split())
    too_long = approx_words > 1200
    checks.append(ATSCheck("Reasonable resume length", "WARNING" if too_long else "PASS",
                            f"~{approx_words} words extracted — consider trimming." if too_long else None))

    # Keyword stuffing heuristic: same term repeated excessively
    words = re.findall(r"[a-z][a-z0-9+.#-]{2,}", plain.lower())
    if words:
        from collections import Counter
        counts = Counter(words)
        top_term, top_count = counts.most_common(1)[0]
        stuffing = top_count > max(8, len(words) // 15)
        checks.append(ATSCheck("No keyword stuffing detected", "WARNING" if stuffing else "PASS",
                                f"'{top_term}' appears {top_count} times." if stuffing else None))

    return checks


def score_resume(latex: str, structured_jd: dict) -> ATSResult:
    plain = latex_to_plain_text(latex)

    required = structured_jd.get("required_skills") or []
    preferred = structured_jd.get("preferred_skills") or []
    keywords = structured_jd.get("keywords") or list(set(required + preferred))

    matched_kw, missing_kw = compute_keyword_coverage(plain, keywords)
    matched_req, missing_req = compute_keyword_coverage(plain, required)
    matched_pref, missing_pref = compute_keyword_coverage(plain, preferred)

    keyword_pct = _pct(len(matched_kw), len(keywords))
    required_pct = _pct(len(matched_req), len(required))
    preferred_pct = _pct(len(matched_pref), len(preferred))

    title = (structured_jd.get("job_title") or "").lower()
    title_terms = set(re.findall(r"[a-z]+", title))
    title_alignment = _pct(len(title_terms & set(re.findall(r"[a-z]+", plain.lower()))), max(len(title_terms), 1))

    exp_req = structured_jd.get("experience_requirements")
    experience_alignment = 100.0 if not exp_req else (70.0 if _years_mentioned(plain) else 40.0)

    edu_req = structured_jd.get("education_requirements")
    education_alignment = 100.0 if not edu_req else (100.0 if _has_education_mention(plain, edu_req) else 30.0)

    checks = run_formatting_checks(latex)
    error_count = sum(1 for c in checks if c.status == "ERROR")
    warning_count = sum(1 for c in checks if c.status == "WARNING")
    formatting_score = max(0.0, 100.0 - error_count * 25 - warning_count * 8)

    breakdown = {
        "keyword_match": round(keyword_pct, 1),
        "required_skills": round(required_pct, 1),
        "preferred_skills": round(preferred_pct, 1),
        "experience_alignment": round(experience_alignment, 1),
        "education_alignment": round(education_alignment, 1),
        "ats_formatting": round(formatting_score, 1),
        "title_alignment": round(title_alignment, 1),
    }

    weights = {
        "keyword_match": 0.20,
        "required_skills": 0.30,
        "preferred_skills": 0.10,
        "experience_alignment": 0.15,
        "education_alignment": 0.10,
        "ats_formatting": 0.15,
    }
    overall = sum(breakdown[k] * w for k, w in weights.items())

    return ATSResult(
        score=round(overall, 1),
        breakdown=breakdown,
        checks=checks,
        matched_keywords=sorted(set(matched_kw)),
        missing_keywords=sorted(set(missing_kw)),
    )


def _pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 100.0
    return 100.0 * numerator / denominator


def _years_mentioned(text: str) -> bool:
    return bool(re.search(r"\b(19|20)\d{2}\b", text))


def _has_education_mention(text: str, edu_req: str) -> bool:
    lower = text.lower()
    for kw in ["bachelor", "master", "b.s.", "m.s.", "phd", "degree", "university", "college"]:
        if kw in lower:
            return True
    return False
