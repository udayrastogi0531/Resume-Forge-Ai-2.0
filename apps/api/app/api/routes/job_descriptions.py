import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.config import get_settings
from app.models.models import JobDescription, User
from app.schemas.schemas import JobDescriptionOut
from app.api.deps import get_current_user
from app.parsers.pdf_extract import extract_text
from app.services.ai_json import get_structured_json, AIJsonError
from app.providers.base import AIProviderError
from app.prompts import jd_extraction

router = APIRouter(prefix="/api/jd", tags=["job_descriptions"])
settings = get_settings()

JD_EXPECTED_KEYS = [
    "job_title", "company", "location", "employment_type", "responsibilities",
    "required_skills", "preferred_skills", "technical_skills", "soft_skills",
    "education_requirements", "experience_requirements", "certifications",
    "keywords", "tools", "programming_languages", "frameworks", "domain_terminology",
]


@router.post("/upload", response_model=JobDescriptionOut)
async def upload_jd(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for job description upload.")

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds the {settings.MAX_UPLOAD_MB}MB limit.")

    extraction = extract_text(contents)
    if extraction.needs_ocr:
        raise HTTPException(
            status_code=422,
            detail="This PDF appears to be scanned/image-based and OCR is not available on this server. "
                   "Please upload a text-based PDF or install Tesseract OCR.",
        )
    if not extraction.text.strip():
        raise HTTPException(status_code=422, detail="Could not extract any text from this PDF.")

    structured = None
    try:
        structured = get_structured_json(
            jd_extraction.SYSTEM_PROMPT,
            jd_extraction.build_user_prompt(extraction.text),
            JD_EXPECTED_KEYS,
        )
    except AIProviderError as e:
        # JD is still saved with raw text even if AI structuring fails —
        # the user can retry analysis later without re-uploading.
        structured = {"_error": str(e)}
    except AIJsonError as e:
        structured = {"_error": str(e)}

    jd = JobDescription(
        user_id=user.id,
        filename=file.filename,
        raw_text=extraction.text,
        structured_data=structured,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


@router.get("", response_model=list[JobDescriptionOut])
def list_jds(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(JobDescription).filter(JobDescription.user_id == user.id).order_by(JobDescription.created_at.desc()).all()


@router.get("/{jd_id}", response_model=JobDescriptionOut)
def get_jd(jd_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Not found")
    return jd


@router.delete("/{jd_id}")
def delete_jd(jd_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(jd)
    db.commit()
    return {"ok": True}
