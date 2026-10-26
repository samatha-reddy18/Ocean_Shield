"""Shared request/response Pydantic models."""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class TextAnalysisRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=5000)
    category: Optional[str] = None


class DuplicateCandidate(BaseModel):
    reportId: str
    latitude: float
    longitude: float
    category: Optional[str] = None
    description: Optional[str] = None
    observationDate: Optional[str] = None


class CheckDuplicatesRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    observationDate: Optional[str] = None
    candidates: List[DuplicateCandidate] = Field(default_factory=list)


class ImageClassificationResponse(BaseModel):
    category: str
    confidence: float
    allScores: Dict[str, float]
    modelVersion: str
    note: str
