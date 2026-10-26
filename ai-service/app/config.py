"""Runtime configuration for the OceanShield AI service.

Environment variables allow tuning without code changes.
"""
import os

# Supported hazard categories the classifier can predict.
SUPPORTED_CATEGORIES = [
    "oil_spill",
    "plastic_pollution",
    "marine_debris",
    "coastal_pollution",
    "algal_bloom",
    "dead_marine_animals",
    "other",
]

# Model artifact path. If absent, the service falls back to a color+texture
# heuristic classifier so the API still works end-to-end during development.
MODEL_PATH = os.getenv("MODEL_PATH", "")

# Minimum confidence to surface as the "predicted" category.
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.4"))

# Model version reported with each prediction (used for traceability).
MODEL_VERSION = os.getenv("MODEL_VERSION", "heuristic-v0.1")

# Whether a deep-learning backend is available.
try:
    import torch  # noqa: F401
    import torchvision  # noqa: F401
    DL_BACKEND = "torchvision"
except Exception:
    try:
        import tensorflow as tf  # noqa: F401
        DL_BACKEND = "tensorflow"
    except Exception:
        DL_BACKEND = "none"

# Duplicate detection thresholds
DUP_DISTANCE_KM = float(os.getenv("DUP_DISTANCE_KM", "5"))
DUP_DAYS = float(os.getenv("DUP_DAYS", "3"))
DUP_THRESHOLD = float(os.getenv("DUP_THRESHOLD", "0.5"))
