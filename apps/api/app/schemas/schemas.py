from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Resume Projects ----------
class ProjectCreate(BaseModel):
    name: str
    initial_latex: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    version_count: int = 0

    class Config:
        from_attributes = True


class VersionCreate(BaseModel):
    name: Optional[str] = None
    latex_source: str
    job_description_id: Optional[str] = None
    ats_score: Optional[float] = None
    ats_breakdown: Optional[Dict[str, Any]] = None


class VersionUpdate(BaseModel):
    name: Optional[str] = None
    latex_source: Optional[str] = None


class VersionOut(BaseModel):
    id: str
    project_id: str
    version_number: int
    name: str
    latex_source: str
    pdf_path: Optional[str] = None
    ats_score: Optional[float] = None
    ats_breakdown: Optional[Dict[str, Any]] = None
    job_description_id: Optional[str] = None
    status: str
    change_summary: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Job Descriptions ----------
class JobDescriptionOut(BaseModel):
    id: str
    filename: Optional[str] = None
    raw_text: str
    structured_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Compilation ----------
class CompileRequest(BaseModel):
    latex_source: str


class CompileResult(BaseModel):
    success: bool
    pdf_base64: Optional[str] = None
    log: str
    errors: List[str] = []
    warnings: List[str] = []
    duration_ms: int


# ---------- ATS ----------
class ATSCheckItem(BaseModel):
    label: str
    status: str  # PASS | WARNING | ERROR
    detail: Optional[str] = None


class ATSResult(BaseModel):
    score: float
    breakdown: Dict[str, float]
    checks: List[ATSCheckItem]
    matched_keywords: List[str]
    missing_keywords: List[str]


class AnalyzeRequest(BaseModel):
    latex_source: str
    job_description_id: str
    version_id: Optional[str] = None


# ---------- AI Tailoring ----------
class TailorRequest(BaseModel):
    latex_source: str
    job_description_id: str
    project_id: str


class ChangeItem(BaseModel):
    type: str  # added | removed | modified | reordered
    section: str
    description: str


class TruthfulnessCheck(BaseModel):
    passed: bool
    fabricated_claims: List[str] = []


class TailorResult(BaseModel):
    updated_latex: str
    changes: List[ChangeItem]
    matched_keywords: List[str]
    missing_keywords: List[str]
    warnings: List[str]
    truthfulness_check: TruthfulnessCheck
    ats_before: Optional[ATSResult] = None
    ats_after: Optional[ATSResult] = None
    compiled: bool
    compile_log: Optional[str] = None


# ---------- Cover Letters ----------
class CoverLetterGenerateRequest(BaseModel):
    resume_version_id: str
    job_description_id: str
    tone: str = "professional"
    length: str = "medium"


class CoverLetterOut(BaseModel):
    id: str
    title: str
    content: str
    tone: str
    length: str
    resume_version_id: Optional[str] = None
    job_description_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
