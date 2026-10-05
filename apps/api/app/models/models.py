import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Boolean, ForeignKey, DateTime, Text, JSON, Float
)
from sqlalchemy.orm import relationship

from app.core.db import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("ResumeProject", back_populates="owner", cascade="all, delete-orphan")
    job_descriptions = relationship("JobDescription", back_populates="owner", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="owner", cascade="all, delete-orphan")


class ResumeProject(Base):
    __tablename__ = "resume_projects"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    versions = relationship(
        "ResumeVersion", back_populates="project", cascade="all, delete-orphan",
        order_by="ResumeVersion.version_number",
    )


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("resume_projects.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False, default="Untitled version")
    latex_source = Column(Text, nullable=False)
    pdf_path = Column(String, nullable=True)
    ats_score = Column(Float, nullable=True)
    ats_breakdown = Column(JSON, nullable=True)
    job_description_id = Column(String, ForeignKey("job_descriptions.id"), nullable=True)
    status = Column(String, default="draft")  # draft | ready | needs_review
    change_summary = Column(JSON, nullable=True)  # list of change objects from AI tailoring
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("ResumeProject", back_populates="versions")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=True)
    raw_text = Column(Text, nullable=False)
    structured_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="job_descriptions")


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    resume_version_id = Column(String, ForeignKey("resume_versions.id"), nullable=True)
    job_description_id = Column(String, ForeignKey("job_descriptions.id"), nullable=True)
    title = Column(String, nullable=False, default="Untitled cover letter")
    content = Column(Text, nullable=False)
    tone = Column(String, default="professional")
    length = Column(String, default="medium")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="cover_letters")


class AnalysisCache(Base):
    """Caches ATS/AI analysis results keyed by hash(resume + jd) to avoid
    redundant AI calls (see AI cost control requirements)."""
    __tablename__ = "analysis_cache"

    id = Column(String, primary_key=True, default=gen_id)
    cache_key = Column(String, unique=True, nullable=False, index=True)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CompileJob(Base):
    __tablename__ = "compile_jobs"

    id = Column(String, primary_key=True, default=gen_id)
    resume_version_id = Column(String, ForeignKey("resume_versions.id"), nullable=True)
    status = Column(String, default="pending")  # pending | success | failed
    log = Column(Text, nullable=True)
    pdf_path = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
