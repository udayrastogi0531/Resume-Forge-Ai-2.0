from fastapi import APIRouter, Depends
from app.schemas.schemas import CompileRequest, CompileResult
from app.compiler.latex_compiler import compile_latex
from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/api/resume", tags=["compile"])


@router.post("/compile", response_model=CompileResult)
def compile_resume(payload: CompileRequest, user: User = Depends(get_current_user)):
    result = compile_latex(payload.latex_source)
    return CompileResult(
        success=result.success,
        pdf_base64=result.pdf_base64,
        log=result.log[-8000:],  # cap log size returned to client
        errors=result.errors,
        warnings=result.warnings,
        duration_ms=result.duration_ms,
    )
