from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import ResumeProject, ResumeVersion, JobDescription, CoverLetter, User
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class RecentProject(BaseModel):
    id: str
    name: str
    version_count: int
    updated_at: str
    latest_version_name: Optional[str] = None
    latest_ats_score: Optional[float] = None


class DashboardStats(BaseModel):
    project_count: int
    version_count: int
    jd_count: int
    cover_letter_count: int
    average_ats_score: Optional[float] = None
    continue_project: Optional[RecentProject] = None


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Single aggregate query set instead of the frontend fetching every
    project's versions individually (N+1). Real counts only — never
    fabricated."""
    project_count = db.query(func.count(ResumeProject.id)).filter(ResumeProject.user_id == user.id).scalar() or 0

    version_count = (
        db.query(func.count(ResumeVersion.id))
        .join(ResumeProject, ResumeVersion.project_id == ResumeProject.id)
        .filter(ResumeProject.user_id == user.id)
        .scalar()
        or 0
    )

    jd_count = db.query(func.count(JobDescription.id)).filter(JobDescription.user_id == user.id).scalar() or 0
    cl_count = db.query(func.count(CoverLetter.id)).filter(CoverLetter.user_id == user.id).scalar() or 0

    avg_score = (
        db.query(func.avg(ResumeVersion.ats_score))
        .join(ResumeProject, ResumeVersion.project_id == ResumeProject.id)
        .filter(ResumeProject.user_id == user.id, ResumeVersion.ats_score.isnot(None))
        .scalar()
    )

    # "Continue where you left off": most recently updated project + its newest version.
    latest_project = (
        db.query(ResumeProject)
        .filter(ResumeProject.user_id == user.id)
        .order_by(ResumeProject.updated_at.desc())
        .first()
    )
    continue_project = None
    if latest_project:
        latest_version = (
            db.query(ResumeVersion)
            .filter(ResumeVersion.project_id == latest_project.id)
            .order_by(ResumeVersion.version_number.desc())
            .first()
        )
        continue_project = RecentProject(
            id=latest_project.id,
            name=latest_project.name,
            version_count=len(latest_project.versions),
            updated_at=latest_project.updated_at.isoformat(),
            latest_version_name=latest_version.name if latest_version else None,
            latest_ats_score=latest_version.ats_score if latest_version else None,
        )

    return DashboardStats(
        project_count=project_count,
        version_count=version_count,
        jd_count=jd_count,
        cover_letter_count=cl_count,
        average_ats_score=round(avg_score, 1) if avg_score is not None else None,
        continue_project=continue_project,
    )
