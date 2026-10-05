import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import CoverLetter, JobDescription, ResumeVersion, ResumeProject, User
from app.schemas.schemas import CoverLetterGenerateRequest, CoverLetterOut, CoverLetterUpdate
from app.api.deps import get_current_user
from app.ats.engine import latex_to_plain_text
from app.services.ai_json import get_structured_json, AIJsonError
from app.providers.base import AIProviderError
from app.prompts import cover_letter as cl_prompt

router = APIRouter(prefix="/api/cover-letters", tags=["cover_letters"])

CL_EXPECTED_KEYS = ["cover_letter", "tone"]


@router.post("/generate", response_model=CoverLetterOut)
def generate_cover_letter(payload: CoverLetterGenerateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    version = (
        db.query(ResumeVersion)
        .join(ResumeProject, ResumeVersion.project_id == ResumeProject.id)
        .filter(ResumeVersion.id == payload.resume_version_id, ResumeProject.user_id == user.id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Resume version not found.")

    jd = db.query(JobDescription).filter(
        JobDescription.id == payload.job_description_id, JobDescription.user_id == user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    resume_text = latex_to_plain_text(version.latex_source)
    structured_jd = jd.structured_data or {}

    try:
        result = get_structured_json(
            cl_prompt.SYSTEM_PROMPT,
            cl_prompt.build_user_prompt(resume_text, json.dumps(structured_jd), payload.tone, payload.length),
            CL_EXPECTED_KEYS,
        )
    except AIProviderError as e:
        raise HTTPException(status_code=502, detail=f"AI provider is temporarily unavailable: {e}")
    except AIJsonError as e:
        raise HTTPException(status_code=502, detail=f"Cover letter generation failed validation: {e}")

    title = f"{structured_jd.get('job_title', 'Cover Letter')} — {structured_jd.get('company') or 'Draft'}"
    cl = CoverLetter(
        user_id=user.id,
        resume_version_id=version.id,
        job_description_id=jd.id,
        title=title,
        content=result["cover_letter"],
        tone=payload.tone,
        length=payload.length,
    )
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return cl


@router.get("", response_model=list[CoverLetterOut])
def list_cover_letters(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(CoverLetter).filter(CoverLetter.user_id == user.id).order_by(CoverLetter.created_at.desc()).all()


@router.get("/{cl_id}", response_model=CoverLetterOut)
def get_cover_letter(cl_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == user.id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Not found")
    return cl


@router.patch("/{cl_id}", response_model=CoverLetterOut)
def update_cover_letter(cl_id: str, payload: CoverLetterUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == user.id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.title is not None:
        cl.title = payload.title
    if payload.content is not None:
        cl.content = payload.content
    db.commit()
    db.refresh(cl)
    return cl


@router.post("/{cl_id}/duplicate", response_model=CoverLetterOut)
def duplicate_cover_letter(cl_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == user.id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Not found")
    new_cl = CoverLetter(
        user_id=user.id,
        resume_version_id=cl.resume_version_id,
        job_description_id=cl.job_description_id,
        title=f"{cl.title} (copy)",
        content=cl.content,
        tone=cl.tone,
        length=cl.length,
    )
    db.add(new_cl)
    db.commit()
    db.refresh(new_cl)
    return new_cl


@router.delete("/{cl_id}")
def delete_cover_letter(cl_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == user.id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(cl)
    db.commit()
    return {"ok": True}
