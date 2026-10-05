from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import JobDescription, ResumeVersion, ResumeProject, User
from app.schemas.schemas import AnalyzeRequest, ATSResult, ATSCheckItem
from app.api.deps import get_current_user
from app.ats.engine import score_resume

router = APIRouter(prefix="/api/resume", tags=["ats"])


@router.post("/analyze", response_model=ATSResult)
def analyze_resume(payload: AnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    jd = db.query(JobDescription).filter(
        JobDescription.id == payload.job_description_id, JobDescription.user_id == user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")
    structured = jd.structured_data or {}
    if "_error" in structured:
        raise HTTPException(status_code=422, detail="This job description was not successfully analyzed by AI. Delete and re-upload it.")

    result = score_resume(payload.latex_source, structured)

    # Persist the score onto the version so it survives page reloads and
    # feeds the dashboard's average ATS score, if a version_id was given
    # and it actually belongs to this user.
    if payload.version_id:
        version = (
            db.query(ResumeVersion)
            .join(ResumeProject, ResumeVersion.project_id == ResumeProject.id)
            .filter(ResumeVersion.id == payload.version_id, ResumeProject.user_id == user.id)
            .first()
        )
        if version:
            version.ats_score = result.score
            version.ats_breakdown = result.breakdown
            db.commit()

    return ATSResult(
        score=result.score,
        breakdown=result.breakdown,
        checks=[ATSCheckItem(label=c.label, status=c.status, detail=c.detail) for c in result.checks],
        matched_keywords=result.matched_keywords,
        missing_keywords=result.missing_keywords,
    )
