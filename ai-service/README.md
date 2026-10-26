# OceanShield AI — AI Service

Python + FastAPI microservice for hazard image classification, NLP extraction, and duplicate detection.

## Stack
- Python 3.11+
- FastAPI + Uvicorn
- OpenCV + Pillow + scikit-learn (image processing)
- PyTorch or TensorFlow (optional deep-learning backend)

## Setup
```bash
cd ai-service
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

For a deep-learning backend, uncomment the `torch`/`tensorflow` lines in `requirements.txt` and set `MODEL_PATH` to a trained artifact. Until then, the image classifier uses a transparent color/texture heuristic (clearly labeled in `modelVersion`).

## Endpoints
| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /analyze-image | Classify a hazard photograph |
| POST | /analyze-text | NLP extraction from a description |
| POST | /check-duplicates | Rule-based duplicate scoring |
| GET | /health | Service availability |

## Important
- AI output is an automated assessment, not a confirmed environmental finding.
- The selected model must be evaluated against representative labelled images before predictions are treated as useful classifications.
- When this service is unavailable, the Express backend still saves reports with `aiStatus = "pending"` or `"unavailable"`.
