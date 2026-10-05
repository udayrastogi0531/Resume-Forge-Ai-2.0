"""End-to-end UI test: drives the real Next.js frontend against the real FastAPI backend.
Run: python3 e2e/full_flow.py  (both servers must be running)."""
import subprocess, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

WEB = "http://localhost:3000"
EMAIL = f"e2e.{int(time.time())}@example.com"
PASSWORD = "password123"

RESUME = r"""\documentclass[11pt]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\begin{document}
\begin{center}
{\LARGE \textbf{Jane Doe}}\\
jane.doe@email.com $\cdot$ (555) 123-4567
\end{center}
\section{Experience}
\textbf{Software Engineer}, Acme Corp \hfill 2022--Present
\begin{itemize}[leftmargin=*]
  \item Built web applications using JavaScript and React.
\end{itemize}
\section{Education}
B.S. Computer Science, State University \hfill 2018--2022
\section{Skills}
JavaScript, Python, SQL, Git, React
\end{document}
"""

JD_TEXT = """Senior Frontend Engineer
Company: Nimbus Labs
Location: Remote
Responsibilities:
- Build user-facing features using React and TypeScript
- Improve performance of our web application
Requirements:
- 3+ years of experience with JavaScript and React
- Experience with TypeScript and GraphQL
- Bachelor's degree in Computer Science
"""

results = []
def ok(name):
    results.append(name); print(f"[PASS] {name}")

def make_jd_pdf(path: Path):
    body = "\\\\\n".join(JD_TEXT.replace("&", "and").splitlines())
    tex = "\\documentclass{article}\\begin{document}\\small\n" + body + "\n\\end{document}"
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "jd.tex").write_text(tex)
        subprocess.run(["pdflatex", "-interaction=nonstopmode", "jd.tex"], cwd=d, capture_output=True, timeout=30)
        path.write_bytes((Path(d) / "jd.pdf").read_bytes())

def main():
    jd_pdf = Path("/tmp/e2e_jd.pdf"); make_jd_pdf(jd_pdf)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(accept_downloads=True, viewport={"width": 1600, "height": 950})
        page = ctx.new_page()
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # unauthenticated redirect
        page.goto(f"{WEB}/dashboard"); page.wait_for_url("**/login", timeout=10000); ok("unauthenticated /dashboard redirects to /login")

        # 1. signup
        page.goto(f"{WEB}/signup")
        page.fill("input[type=email]", EMAIL); page.fill("input[type=password]", PASSWORD)
        page.click("button[type=submit]"); page.wait_for_url("**/dashboard", timeout=15000); ok("signup -> dashboard")
        expect(page.get_by_text("Resume Projects").first).to_be_visible(); ok("dashboard renders with real stats")
        page.screenshot(path="/tmp/shot_dashboard.png")

        # 4. create resume -> editor
        page.get_by_role("button", name="New Resume").click()
        page.wait_for_url("**/editor", timeout=15000); ok("New Resume opens Resume Studio")
        page.wait_for_selector(".monaco-editor", timeout=40000); ok("Monaco editor loaded")

        # 6. edit LaTeX via monaco model
        page.evaluate("""(t) => { const ed = window.__rfEditor; ed.setValue(t); }""", RESUME)
        page.wait_for_timeout(300)
        # 7. compile
        page.get_by_role("button", name="Compile").click()
        page.wait_for_selector("iframe[title=pdf-preview]", timeout=30000); ok("Compile -> PDF preview iframe appears")
        page.wait_for_timeout(1800)
        expect(page.get_by_text("Saved")).to_be_visible(); ok("autosave indicator shows Saved")
        page.screenshot(path="/tmp/shot_editor.png")

        # broken LaTeX keeps source & shows errors
        page.evaluate("""(t) => window.__rfEditor.setValue(t)""", r"\documentclass{article}\begin{document}\oops{x}\end{document}")
        page.get_by_role("button", name="Compile").click()
        page.get_by_text("Compilation failed").first.wait_for(timeout=30000); ok("broken LaTeX shows readable compile errors")
        assert "oops" in page.evaluate("() => window.__rfEditor.getValue()"); ok("source retained after failed compile")
        page.evaluate("""(t) => window.__rfEditor.setValue(t)""", RESUME)
        page.wait_for_timeout(1800)

        # 9. upload JD
        page.goto(f"{WEB}/jd")
        page.set_input_files("input[type=file]", str(jd_pdf))
        page.get_by_text("Nimbus Labs").first.wait_for(timeout=30000); ok("JD upload + real extraction shown")
        expect(page.get_by_text("Required Skills")).to_be_visible(); ok("JD structured fields displayed")
        page.screenshot(path="/tmp/shot_jd.png")

        # 11. back to editor, analyze
        page.goto(f"{WEB}/resumes"); page.get_by_text("Untitled Resume").first.click()
        page.wait_for_selector(".monaco-editor", timeout=40000)
        page.select_option("select >> nth=0", index=1)
        page.get_by_role("button", name="ATS Analyze").click()
        page.get_by_text("ResumeForge ATS Compatibility Score").wait_for(timeout=15000); ok("ATS Analyze shows ResumeForge ATS Compatibility Score")
        page.screenshot(path="/tmp/shot_ats.png")

        # 13. tailor -> diff review
        page.get_by_role("button", name="Tailor Resume").click()
        page.get_by_text("AI has prepared an optimized version").wait_for(timeout=60000); ok("Tailor shows review screen")
        page.wait_for_selector(".monaco-diff-editor", timeout=20000); ok("Monaco diff editor renders")
        expect(page.get_by_text("Truthfulness check")).to_be_visible(); ok("truthfulness check displayed")
        page.screenshot(path="/tmp/shot_tailor.png")
        page.get_by_role("button", name="Apply as New Version").click()
        page.get_by_text("Tailored for").first.wait_for(timeout=15000); ok("Apply as New Version creates v2 in drawer")

        # 16. switch versions
        page.get_by_text("v1", exact=True).first.click(); page.wait_for_timeout(500)
        v1 = page.evaluate("() => window.__rfEditor.getValue()")
        page.get_by_text("Tailored for").first.click(); page.wait_for_timeout(500)
        v2 = page.evaluate("() => window.__rfEditor.getValue()")
        assert v1 != v2, "v1 and v2 sources should differ"; ok("switching between versions loads each version's source")

        # duplicate + delete-with-confirmation
        row = page.locator("div.group", has_text="Tailored for").first
        row.hover(); row.locator("button[title=Duplicate]").click()
        page.locator("div.group", has_text="(copy)").first.wait_for(timeout=10000); ok("duplicate version works")
        row = page.locator("div.group", has_text="(copy)").first
        row.hover(); row.locator("button[title=Delete]").click()
        page.get_by_text("Delete this version?").wait_for(); ok("delete asks for confirmation")
        page.locator("div.fixed").get_by_role("button", name="Delete", exact=True).click()
        page.wait_for_timeout(800)
        assert page.locator("div.group", has_text="(copy)").count() == 0; ok("confirmed delete removes version")

        # 18. cover letter
        page.goto(f"{WEB}/cover-letters/new")
        page.wait_for_timeout(1500)
        page.select_option("select >> nth=0", index=1); page.select_option("select >> nth=1", index=1)
        page.get_by_role("button", name="Generate Cover Letter").last.click()
        page.wait_for_url("**/cover-letters/*", timeout=30000); ok("cover letter generated via real endpoint")
        ta = page.locator("textarea"); ta.wait_for()
        ta.fill(ta.input_value() + "\n\nP.S. Edited in the UI.")
        page.get_by_text("Saved").wait_for(timeout=8000); ok("cover letter edit autosaved")
        page.screenshot(path="/tmp/shot_cl.png")

        # duplicate + delete duplicate
        page.goto(f"{WEB}/cover-letters"); page.wait_for_timeout(800)
        assert page.locator("a[href^='/cover-letters/']").count() >= 1
        card = page.locator("div.border.rounded-lg", has_text="professional").first
        card.locator("button").nth(0).click(); page.wait_for_timeout(1000)
        assert page.locator("h3").count() == 2; ok("duplicate cover letter")
        page.locator("div.border.rounded-lg", has_text="(copy)").first.locator("button").nth(1).click()
        page.locator("div.fixed").get_by_role("button", name="Delete", exact=True).click(); page.wait_for_timeout(1000)
        assert page.locator("h3").count() == 1; ok("delete duplicate cover letter")

        # 23-25 logout / login / persistence
        page.get_by_role("button", name="Log out").click(); page.wait_for_url("**/login", timeout=10000); ok("logout")
        page.fill("input[type=email]", EMAIL); page.fill("input[type=password]", PASSWORD)
        page.click("button[type=submit]"); page.wait_for_url("**/dashboard", timeout=15000); ok("login again")
        page.goto(f"{WEB}/resumes"); page.get_by_text("Untitled Resume").first.wait_for(timeout=10000); ok("resume persisted")
        page.goto(f"{WEB}/cover-letters"); page.wait_for_timeout(800)
        assert page.locator("h3").count() == 1; ok("cover letter persisted")

        real_errors = [e for e in console_errors if "favicon" not in e and "monaco" not in e.lower()]
        print("\nConsole errors:", real_errors[:5] or "none")
        browser.close()
    print(f"\n{len(results)} UI checks passed")

if __name__ == "__main__":
    main()
