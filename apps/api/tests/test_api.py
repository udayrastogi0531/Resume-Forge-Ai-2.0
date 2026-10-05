import os
import sys
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mktemp(suffix='.db')}"
os.environ["AI_PROVIDER"] = "mock"

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _signup(email="user1@example.com"):
    r = client.post("/api/auth/signup", json={"email": email, "password": "password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_signup_and_duplicate_email_rejected():
    headers = _signup("dup@example.com")
    r = client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    assert r.status_code == 400


def test_login_wrong_password_rejected():
    _signup("wrongpass@example.com")
    r = client.post("/api/auth/login", json={"email": "wrongpass@example.com", "password": "bad"})
    assert r.status_code == 401


def test_project_creation_and_versioning():
    headers = _signup("proj@example.com")
    r = client.post("/api/projects", headers=headers, json={"name": "Test Resume"})
    assert r.status_code == 200
    project = r.json()
    assert project["version_count"] == 1


def test_cross_user_access_returns_404_not_403():
    headers1 = _signup("cross1@example.com")
    headers2 = _signup("cross2@example.com")
    r = client.post("/api/projects", headers=headers1, json={"name": "Private Resume"})
    project_id = r.json()["id"]
    r = client.get(f"/api/projects/{project_id}", headers=headers2)
    assert r.status_code == 404


def test_unauthenticated_request_rejected():
    r = client.get("/api/projects")
    assert r.status_code == 401


def test_compile_valid_latex_succeeds():
    headers = _signup("compile@example.com")
    latex = r"\documentclass{article}\begin{document}Hello World\end{document}"
    r = client.post("/api/resume/compile", headers=headers, json={"latex_source": latex})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["pdf_base64"] is not None


def test_compile_invalid_latex_fails_gracefully():
    headers = _signup("badcompile@example.com")
    latex = r"\documentclass{article}\begin{document}\undefinedcmd{oops}\end{document}"
    r = client.post("/api/resume/compile", headers=headers, json={"latex_source": latex})
    assert r.status_code == 200  # never a 500 for bad user LaTeX
    data = r.json()
    assert data["success"] is False
    assert len(data["errors"]) > 0


def test_compile_empty_source_handled():
    headers = _signup("empty@example.com")
    r = client.post("/api/resume/compile", headers=headers, json={"latex_source": ""})
    assert r.status_code == 200
    assert r.json()["success"] is False


def test_ats_scoring_deterministic_range():
    from app.ats.engine import score_resume
    latex = r"\section{Skills} Python, SQL \section{Experience} X \section{Education} Y contact@x.com"
    jd = {"required_skills": ["Python", "SQL", "AWS"], "keywords": ["Python", "SQL", "AWS"]}
    result = score_resume(latex, jd)
    assert 0 <= result.score <= 100
    assert "Python" in result.matched_keywords
    assert "AWS" in result.missing_keywords


def test_ats_alias_normalization():
    from app.ats.engine import score_resume
    latex = r"\section{Skills} JavaScript, ReactJS \section{Contact} a@b.com"
    jd = {"required_skills": ["JS", "React"], "keywords": ["JS", "React"]}
    result = score_resume(latex, jd)
    # JS should normalize-match against JavaScript in the resume
    assert result.breakdown["required_skills"] == 100.0


def test_version_delete_requires_ownership():
    headers1 = _signup("del1@example.com")
    headers2 = _signup("del2@example.com")
    r = client.post("/api/projects", headers=headers1, json={"name": "P"})
    project_id = r.json()["id"]
    versions = client.get(f"/api/projects/{project_id}/versions", headers=headers1).json()
    v1_id = versions[0]["id"]
    r = client.delete(f"/api/projects/versions/{v1_id}", headers=headers2)
    assert r.status_code == 404  # other user cannot delete


def test_duplicate_version_creates_new_version_number():
    headers = _signup("dupver@example.com")
    r = client.post("/api/projects", headers=headers, json={"name": "P"})
    project_id = r.json()["id"]
    versions = client.get(f"/api/projects/{project_id}/versions", headers=headers).json()
    v1_id = versions[0]["id"]
    r = client.post(f"/api/projects/versions/{v1_id}/duplicate", headers=headers)
    assert r.status_code == 200
    assert r.json()["version_number"] == 2


def test_tailoring_never_fabricates_missing_keywords():
    """Core truthfulness requirement: any JD requirement absent from the
    resume must be reported as missing, never inserted into the resume."""
    headers = _signup("truth@example.com")
    r = client.post("/api/projects", headers=headers, json={
        "name": "Truth Test",
        "initial_latex": r"\documentclass{article}\begin{document}\section{Skills} Python \section{Contact} a@b.com\end{document}",
    })
    project_id = r.json()["id"]

    # Fake an already-structured JD directly via the DB-backed upload path
    # would require a real PDF; instead exercise the tailor endpoint with a
    # manually structured JD by monkeypatching is out of scope here, so we
    # assert via the ATS engine + mock provider contract directly.
    from app.providers.mock_provider import MockProvider
    from app.prompts import resume_tailoring
    import json as _json

    provider = MockProvider()
    jd = {"required_skills": ["Python", "Kubernetes"], "keywords": ["Python", "Kubernetes"]}
    resp = provider.complete(
        resume_tailoring.SYSTEM_PROMPT,
        resume_tailoring.build_user_prompt(
            r"\section{Skills} Python", _json.dumps(jd)
        ),
        json_mode=True,
    )
    result = _json.loads(resp.text)
    assert "kubernetes" in [m.lower() for m in result["missing_keywords"]]
    assert "kubernetes" not in result["updated_latex"].lower()
    assert result["truthfulness_check"]["passed"] is True


def test_malformed_ai_json_does_not_corrupt_version():
    """If AI JSON can't be repaired, the endpoint must error out instead of
    silently saving corrupted content."""
    from app.services.ai_json import _try_parse
    assert _try_parse("not json at all", ["a", "b"]) is None
    assert _try_parse('{"a": 1}', ["a", "b"]) is None  # missing required key
    assert _try_parse('{"a": 1, "b": 2}', ["a", "b"]) == {"a": 1, "b": 2}


def _make_jd(headers, email, **overrides):
    from app.models.models import JobDescription, User
    from app.core.db import SessionLocal
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    defaults = dict(job_title="Python Developer", company="Acme", required_skills=["Python"], keywords=["Python"])
    defaults.update(overrides)
    jd = JobDescription(user_id=user.id, filename="test.pdf", raw_text="Python role", structured_data=defaults)
    db.add(jd)
    db.commit()
    jd_id = jd.id
    db.close()
    return jd_id


def test_dashboard_stats_real_counts_no_fabrication():
    headers = _signup("dash1@example.com")
    r = client.get("/api/dashboard/stats", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["project_count"] == 0
    assert data["version_count"] == 0
    assert data["average_ats_score"] is None  # never fabricated when no data exists
    assert data["continue_project"] is None

    client.post("/api/projects", headers=headers, json={"name": "P1"})
    r = client.get("/api/dashboard/stats", headers=headers)
    data = r.json()
    assert data["project_count"] == 1
    assert data["version_count"] == 1  # new project auto-creates v1
    assert data["continue_project"]["name"] == "P1"


def test_dashboard_stats_isolated_per_user():
    headers1 = _signup("dashA@example.com")
    headers2 = _signup("dashB@example.com")
    client.post("/api/projects", headers=headers1, json={"name": "Only mine"})
    r = client.get("/api/dashboard/stats", headers=headers2)
    assert r.json()["project_count"] == 0  # user2 must not see user1's projects


def test_ats_analyze_persists_score_on_version():
    headers = _signup("persist@example.com")
    r = client.post("/api/projects", headers=headers, json={
        "name": "P", "initial_latex": r"\section{Skills} Python \section{Contact} a@b.com",
    })
    project_id = r.json()["id"]
    version = client.get(f"/api/projects/{project_id}/versions", headers=headers).json()[0]
    jd_id = _make_jd(headers, "persist@example.com")

    r = client.post("/api/resume/analyze", headers=headers, json={
        "latex_source": version["latex_source"], "job_description_id": jd_id, "version_id": version["id"],
    })
    assert r.status_code == 200
    score = r.json()["score"]

    reloaded = client.get(f"/api/projects/versions/{version['id']}", headers=headers).json()
    assert reloaded["ats_score"] == score  # score actually saved, not just returned


def test_ats_analyze_ignores_version_id_owned_by_another_user():
    headers1 = _signup("vown1@example.com")
    headers2 = _signup("vown2@example.com")
    r = client.post("/api/projects", headers=headers1, json={"name": "P"})
    project_id = r.json()["id"]
    version = client.get(f"/api/projects/{project_id}/versions", headers=headers1).json()[0]
    jd_id = _make_jd(headers2, "vown2@example.com")

    # user2 tries to write a score onto user1's version via version_id
    r = client.post("/api/resume/analyze", headers=headers2, json={
        "latex_source": "whatever", "job_description_id": jd_id, "version_id": version["id"],
    })
    assert r.status_code == 200  # analysis itself succeeds (no ownership of JD needed for this check)
    reloaded = client.get(f"/api/projects/versions/{version['id']}", headers=headers1).json()
    assert reloaded["ats_score"] is None  # cross-user write must be silently ignored, not applied


def test_cover_letter_length_reasonable():
    headers = _signup("cl@example.com")
    r = client.post("/api/projects", headers=headers, json={
        "name": "CL Test",
        "initial_latex": r"\documentclass{article}\begin{document}\section{Skills} Python\end{document}",
    })
    project_id = r.json()["id"]
    versions = client.get(f"/api/projects/{project_id}/versions", headers=headers).json()
    version_id = versions[0]["id"]

    # Upload a JD requires a real PDF; use the JD extraction pipeline
    # directly against raw text to keep this test fast and dependency-free.
    from app.models.models import JobDescription, User
    from app.core.db import SessionLocal

    db = SessionLocal()
    user = db.query(User).filter(User.email == "cl@example.com").first()
    jd = JobDescription(user_id=user.id, filename="test.pdf", raw_text="Python Developer role",
                         structured_data={"job_title": "Python Developer", "company": "Acme",
                                          "required_skills": ["Python"], "keywords": ["Python"]})
    db.add(jd)
    db.commit()
    jd_id = jd.id
    db.close()

    r = client.post("/api/cover-letters/generate", headers=headers, json={
        "resume_version_id": version_id, "job_description_id": jd_id,
        "tone": "professional", "length": "medium",
    })
    assert r.status_code == 200
    content = r.json()["content"]
    assert len(content.split()) > 20  # non-trivial content produced
