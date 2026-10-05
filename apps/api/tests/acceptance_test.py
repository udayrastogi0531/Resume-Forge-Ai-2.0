import base64
import json
import time
import httpx

BASE = "http://localhost:8000"

SAMPLE_LATEX = r"""\documentclass[11pt,letterpaper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\pagestyle{empty}
\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]
\begin{document}
\begin{center}
{\LARGE \textbf{Jane Doe}}\\
jane.doe@email.com $\cdot$ (555) 123-4567 $\cdot$ San Francisco, CA
\end{center}
\section{Experience}
\textbf{Software Engineer}, Acme Corp \hfill 2022--Present
\begin{itemize}[leftmargin=*]
  \item Built web applications using JavaScript and React.
  \item Collaborated with cross-functional teams to ship features.
\end{itemize}
\section{Education}
B.S. Computer Science, State University \hfill 2018--2022
\section{Skills}
JavaScript, Python, SQL, Git, React
\end{document}
"""

SAMPLE_JD_TEXT = """Senior Frontend Engineer

Company: Nimbus Labs
Location: Remote

About:
Nimbus Labs is hiring a Senior Frontend Engineer to join our product team.

Responsibilities:
- Build and maintain user-facing features using React and TypeScript
- Collaborate with designers and backend engineers
- Improve performance and accessibility of our web application

Requirements:
- 3+ years of experience with JavaScript and React
- Experience with TypeScript
- Familiarity with GraphQL and Next.js
- Bachelor's degree in Computer Science or equivalent experience

Nice to have:
- Experience with Tailwind CSS
- Experience with testing frameworks
"""


def step(name):
    print(f"\n=== {name} ===")


def check(condition, msg):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {msg}")
    if not condition:
        raise AssertionError(msg)


def main():
    client = httpx.Client(base_url=BASE, timeout=30)

    # 1. Signup (unique email each run)
    step("Signup")
    email = f"jane.{int(time.time())}@example.com"
    r = client.post("/api/auth/signup", json={"email": email, "password": "password123", "full_name": "Jane Doe"})
    check(r.status_code == 200, f"signup status {r.status_code}: {r.text}")
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Auth check on protected route
    step("Auth /me")
    r = client.get("/api/auth/me", headers=headers)
    check(r.status_code == 200 and r.json()["email"] == email, "me returns correct user")

    # 2b. A second user must never see the first user's data
    step("Second user isolation")
    email2 = f"other.{int(time.time())}@example.com"
    r2 = client.post("/api/auth/signup", json={"email": email2, "password": "password123"})
    token2 = r2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. Create resume project
    step("Create resume project")
    r = client.post("/api/projects", headers=headers, json={"name": "Software Engineer Resume", "initial_latex": SAMPLE_LATEX})
    check(r.status_code == 200, f"create project {r.status_code}: {r.text}")
    project = r.json()
    project_id = project["id"]
    check(project["version_count"] == 1, "new project has exactly 1 version (v1)")

    # cross-user access must 404, not 403 (don't leak existence)
    r = client.get(f"/api/projects/{project_id}", headers=headers2)
    check(r.status_code == 404, "other user cannot access project (404)")

    # 4. Compile the resume -> real PDF
    step("Compile LaTeX -> PDF")
    r = client.post("/api/resume/compile", headers=headers, json={"latex_source": SAMPLE_LATEX})
    check(r.status_code == 200, f"compile status {r.status_code}")
    compile_result = r.json()
    check(compile_result["success"] is True, "compilation succeeded")
    pdf_bytes = base64.b64decode(compile_result["pdf_base64"])
    check(len(pdf_bytes) > 1000, f"got a real PDF ({len(pdf_bytes)} bytes)")
    with open("/tmp/acceptance_resume.pdf", "wb") as f:
        f.write(pdf_bytes)

    # 4b. Compile failure path must not crash
    step("Compile broken LaTeX (must fail gracefully)")
    r = client.post("/api/resume/compile", headers=headers, json={"latex_source": r"\documentclass{article}\begin{document}\section{Oops \nosuch{x}\end{document}"})
    check(r.status_code == 200, "broken compile still returns 200 with success=false")
    check(r.json()["success"] is False, "broken LaTeX correctly reported as failed")
    check(len(r.json()["errors"]) > 0, "readable errors returned")

    # 5. Upload JD (as a real PDF built on the fly)
    step("Upload Job Description PDF")
    jd_pdf_bytes = build_jd_pdf(SAMPLE_JD_TEXT)
    files = {"file": ("nimbus_jd.pdf", jd_pdf_bytes, "application/pdf")}
    r = client.post("/api/jd/upload", headers=headers, files=files)
    check(r.status_code == 200, f"jd upload status {r.status_code}: {r.text}")
    jd = r.json()
    jd_id = jd["id"]
    check(len(jd["raw_text"]) > 50, "JD text was extracted from the PDF")
    check(jd["structured_data"] is not None and "_error" not in jd["structured_data"], "JD was structured by AI (mock) provider")
    print("Extracted JD title:", jd["structured_data"].get("job_title"))
    print("Required skills:", jd["structured_data"].get("required_skills"))

    # 6. ATS analysis (deterministic)
    step("ATS Analyze")
    r = client.post("/api/resume/analyze", headers=headers, json={"latex_source": SAMPLE_LATEX, "job_description_id": jd_id})
    check(r.status_code == 200, f"analyze status {r.status_code}: {r.text}")
    ats = r.json()
    print("ATS score:", ats["score"], "breakdown:", ats["breakdown"])
    print("Missing keywords:", ats["missing_keywords"])
    check("score" in ats and 0 <= ats["score"] <= 100, "ATS score in valid range")

    # 7. AI Tailor resume
    step("Tailor Resume (AI + validation pipeline)")
    r = client.post("/api/resume/tailor", headers=headers, json={
        "latex_source": SAMPLE_LATEX, "job_description_id": jd_id, "project_id": project_id,
    })
    check(r.status_code == 200, f"tailor status {r.status_code}: {r.text}")
    tailor = r.json()
    check(tailor["compiled"] is True, "tailored LaTeX compiled successfully")
    check(tailor["truthfulness_check"]["passed"] is True, "truthfulness check passed")
    check(tailor["ats_before"]["score"] is not None and tailor["ats_after"]["score"] is not None, "ats before/after present")
    print("ATS before:", tailor["ats_before"]["score"], "-> after:", tailor["ats_after"]["score"])
    print("Changes:", tailor["changes"])
    print("Missing keywords (never fabricated into resume):", tailor["missing_keywords"])
    # Truthfulness spot-check: make sure no invented skill from missing_keywords
    # was silently inserted into updated_latex as new content.
    for kw in tailor["missing_keywords"]:
        check(kw.lower() not in tailor["updated_latex"].lower() or kw.lower() in SAMPLE_LATEX.lower(),
              f"missing keyword '{kw}' was not fabricated into the resume")

    # 8. Save tailored result as a new version
    step("Save as new version (v2)")
    r = client.post(f"/api/projects/{project_id}/versions", headers=headers, json={
        "name": "Tailored for Nimbus Labs Frontend Engineer",
        "latex_source": tailor["updated_latex"],
        "job_description_id": jd_id,
    })
    check(r.status_code == 200, f"create version status {r.status_code}: {r.text}")
    v2 = r.json()
    check(v2["version_number"] == 2, "second version numbered v2")
    v2_id = v2["id"]

    # 9. List versions, open old + new
    step("List/open versions")
    r = client.get(f"/api/projects/{project_id}/versions", headers=headers)
    versions = r.json()
    check(len(versions) == 2, "project now has 2 versions")
    v1_id = [v["id"] for v in versions if v["version_number"] == 1][0]
    r = client.get(f"/api/projects/versions/{v1_id}", headers=headers)
    check(r.status_code == 200, "can open v1")
    r = client.get(f"/api/projects/versions/{v2_id}", headers=headers)
    check(r.status_code == 200, "can open v2")

    # 10. Rename, duplicate, delete duplicate
    step("Rename / duplicate / delete version")
    r = client.patch(f"/api/projects/versions/{v2_id}", headers=headers, json={"name": "Nimbus Labs - Final"})
    check(r.status_code == 200 and r.json()["name"] == "Nimbus Labs - Final", "rename works")
    r = client.post(f"/api/projects/versions/{v2_id}/duplicate", headers=headers)
    check(r.status_code == 200, "duplicate works")
    dup_id = r.json()["id"]
    r = client.delete(f"/api/projects/versions/{dup_id}", headers=headers)
    check(r.status_code == 200, "delete duplicate works")

    # 11. Generate cover letter
    step("Generate cover letter")
    r = client.post("/api/cover-letters/generate", headers=headers, json={
        "resume_version_id": v2_id, "job_description_id": jd_id, "tone": "professional", "length": "medium",
    })
    check(r.status_code == 200, f"cover letter status {r.status_code}: {r.text}")
    cl = r.json()
    cl_id = cl["id"]
    word_count = len(cl["content"].split())
    print("Cover letter word count:", word_count)
    print("Cover letter title:", cl["title"])

    # 12. Edit, duplicate, delete cover letter
    step("Edit / duplicate / delete cover letter")
    r = client.patch(f"/api/cover-letters/{cl_id}", headers=headers, json={"title": "Nimbus Labs Cover Letter v1"})
    check(r.status_code == 200, "cover letter rename works")
    r = client.post(f"/api/cover-letters/{cl_id}/duplicate", headers=headers)
    check(r.status_code == 200, "cover letter duplicate works")
    cl_dup_id = r.json()["id"]
    r = client.delete(f"/api/cover-letters/{cl_dup_id}", headers=headers)
    check(r.status_code == 200, "cover letter delete works")

    # 13. Logout/login again -> verify persistence
    step("Re-login and verify persistence")
    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    check(r.status_code == 200, "re-login works")
    new_token = r.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}
    r = client.get("/api/projects", headers=new_headers)
    projects = r.json()
    check(any(p["id"] == project_id for p in projects), "project persists across login sessions")
    r = client.get(f"/api/projects/{project_id}/versions", headers=new_headers)
    check(len(r.json()) == 2, "versions persist (2 remain after duplicate+delete)")
    r = client.get("/api/cover-letters", headers=new_headers)
    check(len(r.json()) == 1, "exactly 1 cover letter remains after duplicate+delete")

    print("\n\nALL ACCEPTANCE TEST STEPS PASSED")


def build_jd_pdf(text: str) -> bytes:
    """Builds a tiny real PDF containing the JD text, using pdflatex, so the
    upload test exercises the real PDF text-extraction path."""
    import subprocess
    import tempfile
    from pathlib import Path

    escaped = text.replace("\\", "").replace("_", "-").replace("&", "and")
    lines = "\\\\\n".join(escaped.splitlines())
    tex = (
        "\\documentclass{article}\\usepackage[utf8]{inputenc}"
        "\\begin{document}\\small\n" + lines + "\n\\end{document}"
    )
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "jd.tex"
        p.write_text(tex)
        subprocess.run(["pdflatex", "-interaction=nonstopmode", "-output-directory", d, str(p)],
                       cwd=d, capture_output=True, timeout=20)
        return (Path(d) / "jd.pdf").read_bytes()


if __name__ == "__main__":
    main()
