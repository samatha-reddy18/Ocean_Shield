"""OceanShield AI microservice entry point.

Endpoints:
  POST /analyze-image   — classify a hazard photograph
  POST /analyze-text     — NLP extraction from a description
  POST /check-duplicates — rule-based duplicate scoring against a payload
  GET  /health           — service availability

Run: uvicorn app.main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import image, text, duplicates

app = FastAPI(
    title="OceanShield AI Service",
    description="AI-assisted hazard image classification, NLP extraction, and duplicate detection.",
    version="1.0.0",
)

# CORS for the Express backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image.router, tags=["Image Classification"])
app.include_router(text.router, tags=["NLP Analysis"])
app.include_router(duplicates.router, tags=["Duplicate Detection"])


@app.get("/health")
def health():
    from app.config import DL_BACKEND, MODEL_VERSION
    return {
        "status": "ok",
        "service": "oceanshield-ai",
        "dl_backend": DL_BACKEND,
        "model_version": MODEL_VERSION,
    }
