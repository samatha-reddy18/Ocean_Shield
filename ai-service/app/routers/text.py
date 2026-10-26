"""POST /analyze-text — NLP extraction from a hazard description."""
from fastapi import APIRouter, HTTPException

from app.schemas import TextAnalysisRequest
from app.services.text_analysis import analyze

router = APIRouter()


@router.post("/analyze-text")
def analyze_text(req: TextAnalysisRequest):
    if not req.description or not req.description.strip():
        raise HTTPException(status_code=400, detail="description is required")
    result = analyze(req.description, req.category)
    return result
