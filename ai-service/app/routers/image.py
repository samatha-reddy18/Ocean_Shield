"""POST /analyze-image — classify a hazard photograph."""
import io
from fastapi import APIRouter, File, UploadFile, HTTPException

from app.services.image_classifier import classifier

router = APIRouter()


@router.post("/analyze-image")
async def analyze_image(image: UploadFile = File(...)):
    # Validate content type
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file.")

    try:
        result = classifier.classify(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Unsupported image: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")

    return result
