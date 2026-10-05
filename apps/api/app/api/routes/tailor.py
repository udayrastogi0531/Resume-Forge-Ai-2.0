import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import JobDescription, ResumeProject, AnalysisCache, User
from app.schemas.schemas import (
    TailorRequest, TailorResult, ChangeItem, TruthfulnessCheck, ATSResult, ATSCheckItem,
)
from app.api.deps import get_current_user
from app.ats.engine import score_resume
from app.compiler.latex_compiler import compile_latex
from app.services.ai_json import get_structured_json, AIJsonError
from app.providers.base import AIProviderError
from app.prompts import resume_tailoring

router = APIRouter(prefix="/api/resume", tags=["tailor"])

TAILOR_EXPECTED_KEYS = [
    "updated_latex", "changes", "matched_keywords", "missing_keywords",
    "warnings", "truthfulness_check",
]


def _cache_key(latex: str, jd_id: str) -> str:
    h = hashlib.sha256()
    h.update(latex.encode("utf-8"))
    h.update(jd_id.encode("utf-8"))
    return h.hexdigest()


def _to_ats_result(r) -> ATSResult:
    return ATSResult(
        score=r.score, breakdown=r.breakdown,
        checks=[ATSCheckItem(label=c.label, status=c.status, detail=c.detail) for c in r.checks],
        matched_keywords=r.matched_keywords, missing_keywords=r.missing_keywords,
    )


@router.post("/tailor", response_model=TailorResult)
def tailor_resume(payload: TailorRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(ResumeProject).filter(
        ResumeProject.id == payload.project_id, ResumeProject.user_id == user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    jd = db.query(JobDescription).filter(
        JobDescription.id == payload.job_description_id, JobDescription.user_id == user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    structured_jd = jd.structured_data or {}
    if "_error" in structured_jd:
        raise HTTPException(status_code=422, detail="This job description failed AI analysis. Re-upload it before tailoring.")

    # --- AI cost control: cache identical (resume, jd) tailoring requests ---
    key = _cache_key(payload.latex_source, payload.job_description_id)
    cached = db.query(AnalysisCache).filter(AnalysisCache.cache_key == key).first()

    ats_before = score_resume(payload.latex_source, structured_jd)

    if cached:
        ai_result = cached.result
    else:
        try:
            ai_result = get_structured_json(
                resume_tailoring.SYSTEM_PROMPT,
                resume_tailoring.build_user_prompt(
                    payload.latex_source, json.dumps(structured_jd), json.dumps(ats_before.breakdown)
                ),
                TAILOR_EXPECTED_KEYS,
            )
        except AIProviderError as e:
            raise HTTPException(status_code=502, detail=f"AI provider is temporarily unavailable: {e}. Your original resume has not been changed.")
        except AIJsonError as e:
            raise HTTPException(status_code=502, detail=f"AI tailoring failed validation: {e}. Your original resume has not been changed.")

        db.add(AnalysisCache(cache_key=key, result=ai_result))
        db.commit()

    updated_latex = ai_result.get("updated_latex", "")
    truthfulness = ai_result.get("truthfulness_check", {"passed": True, "fabricated_claims": []})

    # --- Post-tailor validation pipeline ---
    compile_result = compile_latex(updated_latex)
    compiled = compile_result.success

    if not compiled:
        # Do not save as final version; keep original intact.
        return TailorResult(
            updated_latex=payload.latex_source,  # fall back to original, unchanged
            changes=[],
            matched_keywords=[],
            missing_keywords=ai_result.get("missing_keywords", []),
            warnings=["AI-tailored LaTeX failed to compile. Your original resume was preserved unchanged."] + compile_result.errors[:5],
            truthfulness_check=TruthfulnessCheck(**truthfulness),
            ats_before=_to_ats_result(ats_before),
            ats_after=None,
            compiled=False,
            compile_log=compile_result.log[-4000:],
        )

    ats_after = score_resume(updated_latex, structured_jd)

    changes = [ChangeItem(**c) for c in ai_result.get("changes", []) if "type" in c and "section" in c and "description" in c]

    return TailorResult(
        updated_latex=updated_latex,
        changes=changes,
        matched_keywords=ai_result.get("matched_keywords", []),
        missing_keywords=ai_result.get("missing_keywords", []),
        warnings=ai_result.get("warnings", []),
        truthfulness_check=TruthfulnessCheck(**truthfulness),
        ats_before=_to_ats_result(ats_before),
        ats_after=_to_ats_result(ats_after),
        compiled=True,
        compile_log=None,
    )
