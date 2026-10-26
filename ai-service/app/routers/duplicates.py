"""POST /check-duplicates — rule-based duplicate scoring."""
from fastapi import APIRouter

from app.schemas import CheckDuplicatesRequest
from app.services.duplicate_detector import find_duplicates

router = APIRouter()


@router.post("/check-duplicates")
def check_duplicates(req: CheckDuplicatesRequest):
    target = {
        "latitude": req.latitude,
        "longitude": req.longitude,
        "category": req.category,
        "description": req.description,
        "observationDate": req.observationDate,
    }
    candidates = [c.dict() for c in req.candidates]
    duplicates = find_duplicates(target, candidates)
    return {
        "source": "rule-based",
        "duplicates": duplicates,
        "note": "Flagged for review; not automatically deleted.",
    }
