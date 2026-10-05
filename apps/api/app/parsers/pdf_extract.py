"""
PDF text extraction pipeline.

Order of attempts:
1. pdfplumber (good layout-aware text extraction)
2. PyMuPDF/fitz (fast fallback, handles more edge cases)
3. If both yield near-empty text, the PDF is likely scanned/image-based ->
   flag `needs_ocr=True` so the caller can run Tesseract OCR if installed.
   We do not hard-require Tesseract at import time (it may not be present
   in every deployment); if it's missing we surface a clear error instead
   of crashing.
"""
import io
from dataclasses import dataclass

import pdfplumber
import fitz  # PyMuPDF


@dataclass
class ExtractionResult:
    text: str
    page_count: int
    needs_ocr: bool
    method: str


MIN_CHARS_PER_PAGE_THRESHOLD = 20


def extract_text(pdf_bytes: bytes) -> ExtractionResult:
    text, page_count = _extract_with_pdfplumber(pdf_bytes)
    method = "pdfplumber"

    if _looks_empty(text, page_count):
        text2, page_count2 = _extract_with_fitz(pdf_bytes)
        if len(text2.strip()) > len(text.strip()):
            text, page_count, method = text2, page_count2, "pymupdf"

    needs_ocr = _looks_empty(text, page_count)
    if needs_ocr:
        ocr_text = _try_ocr(pdf_bytes)
        if ocr_text:
            text, method, needs_ocr = ocr_text, "tesseract_ocr", False

    return ExtractionResult(text=clean_text(text), page_count=page_count,
                             needs_ocr=needs_ocr, method=method)


def _looks_empty(text: str, page_count: int) -> bool:
    if page_count == 0:
        return True
    return len(text.strip()) < MIN_CHARS_PER_PAGE_THRESHOLD * page_count


def _extract_with_pdfplumber(pdf_bytes: bytes):
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n".join(pages), len(pdf.pages)
    except Exception:
        return "", 0


def _extract_with_fitz(pdf_bytes: bytes):
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return "\n".join(pages), doc.page_count
    except Exception:
        return "", 0


def _try_ocr(pdf_bytes: bytes) -> str | None:
    """Best-effort OCR fallback using Tesseract, if installed. Returns None
    (not raises) if Tesseract or pytesseract isn't available, so the caller
    can show a clear 'scanned PDF, OCR unavailable' error instead of a 500."""
    try:
        import pytesseract  # noqa
        from PIL import Image
    except ImportError:
        return None

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        chunks = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            chunks.append(pytesseract.image_to_string(img))
        return "\n".join(chunks)
    except Exception:
        return None


def clean_text(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)
