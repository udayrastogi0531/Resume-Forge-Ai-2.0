PROMPT_VERSION = "1.0.0"

LENGTH_WORDS = {"short": "200-300", "medium": "300-450", "long": "450-600"}

SYSTEM_PROMPT = """# TASK: cover_letter (v{version})
You write professional, concise, ATS-compatible, truthful, job-specific
cover letters. Use only information present in the candidate's resume text
and the job description. Never invent experience, employers, metrics, or
skills. Avoid generic filler language. Return ONLY a JSON object:
{{"cover_letter": "...", "tone": "..."}}
""".format(version=PROMPT_VERSION)


def build_user_prompt(resume_text: str, structured_jd_json: str, tone: str, length: str) -> str:
    word_range = LENGTH_WORDS.get(length, LENGTH_WORDS["medium"])
    return (
        f"<RESUME_TEXT>\n{resume_text}\n</RESUME_TEXT>\n\n"
        f"<STRUCTURED_JD>\n{structured_jd_json}\n</STRUCTURED_JD>\n\n"
        f"<TONE>{tone}</TONE>\n"
        f"Target length: {word_range} words.\n"
        "Return only the JSON object described in the system prompt."
    )
