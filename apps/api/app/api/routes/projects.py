from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import ResumeProject, ResumeVersion, User
from app.schemas.schemas import ProjectCreate, ProjectOut, VersionCreate, VersionOut, VersionUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])

DEFAULT_LATEX = r"""\documentclass[11pt,letterpaper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\pagestyle{empty}
\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]

\begin{document}

\begin{center}
{\LARGE \textbf{Your Name}}\\
your.email@example.com $\cdot$ (555) 123-4567 $\cdot$ City, State
\end{center}

\section{Experience}
\textbf{Job Title}, Company Name \hfill 2022--Present
\begin{itemize}[leftmargin=*]
  \item Describe a real responsibility or accomplishment.
\end{itemize}

\section{Education}
Degree, School Name \hfill Year--Year

\section{Skills}
List your real skills here, comma separated.

\end{document}
"""


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    projects = db.query(ResumeProject).filter(ResumeProject.user_id == user.id).all()
    out = []
    for p in projects:
        item = ProjectOut.model_validate(p)
        item.version_count = len(p.versions)
        out.append(item)
    return out


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = ResumeProject(user_id=user.id, name=payload.name)
    db.add(project)
    db.flush()

    version = ResumeVersion(
        project_id=project.id,
        version_number=1,
        name="v1",
        latex_source=payload.initial_latex or DEFAULT_LATEX,
        status="draft",
    )
    db.add(version)
    db.commit()
    db.refresh(project)

    out = ProjectOut.model_validate(project)
    out.version_count = 1
    return out


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(ResumeProject).filter(ResumeProject.id == project_id, ResumeProject.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    out = ProjectOut.model_validate(project)
    out.version_count = len(project.versions)
    return out


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(ResumeProject).filter(ResumeProject.id == project_id, ResumeProject.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(project)
    db.commit()
    return {"ok": True}


# ---------- Versions ----------

@router.get("/{project_id}/versions", response_model=list[VersionOut])
def list_versions(project_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(ResumeProject).filter(ResumeProject.id == project_id, ResumeProject.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    return project.versions


@router.post("/{project_id}/versions", response_model=VersionOut)
def create_version(project_id: str, payload: VersionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(ResumeProject).filter(ResumeProject.id == project_id, ResumeProject.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    next_number = max([v.version_number for v in project.versions], default=0) + 1
    version = ResumeVersion(
        project_id=project.id,
        version_number=next_number,
        name=payload.name or f"v{next_number}",
        latex_source=payload.latex_source,
        job_description_id=payload.job_description_id,
        ats_score=payload.ats_score,
        ats_breakdown=payload.ats_breakdown,
        status="draft",
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/versions/{version_id}", response_model=VersionOut)
def get_version(version_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    version = _get_owned_version(db, version_id, user.id)
    return version


@router.patch("/versions/{version_id}", response_model=VersionOut)
def update_version(version_id: str, payload: VersionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    version = _get_owned_version(db, version_id, user.id)
    if payload.name is not None:
        version.name = payload.name
    if payload.latex_source is not None:
        version.latex_source = payload.latex_source
        version.status = "draft"  # needs recompile/re-review after edits
    db.commit()
    db.refresh(version)
    return version


@router.post("/versions/{version_id}/duplicate", response_model=VersionOut)
def duplicate_version(version_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    version = _get_owned_version(db, version_id, user.id)
    project = version.project
    next_number = max([v.version_number for v in project.versions], default=0) + 1
    new_version = ResumeVersion(
        project_id=project.id,
        version_number=next_number,
        name=f"{version.name} (copy)",
        latex_source=version.latex_source,
        job_description_id=version.job_description_id,
        status="draft",
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    return new_version


@router.delete("/versions/{version_id}")
def delete_version(version_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    version = _get_owned_version(db, version_id, user.id)
    db.delete(version)
    db.commit()
    return {"ok": True}


def _get_owned_version(db: Session, version_id: str, user_id: str) -> ResumeVersion:
    version = (
        db.query(ResumeVersion)
        .join(ResumeProject, ResumeVersion.project_id == ResumeProject.id)
        .filter(ResumeVersion.id == version_id, ResumeProject.user_id == user_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Not found")
    return version
