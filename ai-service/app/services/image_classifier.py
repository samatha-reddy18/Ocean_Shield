"""Hazard image classification.

When a trained model artifact (MODEL_PATH) is present, this module loads it
and runs real inference. Otherwise it falls back to a transparent,
color-and-texture heuristic so the API still functions during development —
but that fallback is clearly labeled in modelVersion so predictions are never
presented as if they came from a trained model.
"""
import os
from typing import Dict

import numpy as np

from app.config import (
    SUPPORTED_CATEGORIES,
    MODEL_PATH,
    MODEL_VERSION,
    CONFIDENCE_THRESHOLD,
    DL_BACKEND,
)


class HazardClassifier:
    def __init__(self):
        self.model = None
        self.is_trained_model = False
        self.model_version = MODEL_VERSION
        self._load()

    def _load(self):
        """Load a trained model if an artifact path is configured and available."""
        if MODEL_PATH and os.path.exists(MODEL_PATH):
            try:
                if DL_BACKEND == "torchvision":
                    import torch
                    self.model = torch.load(MODEL_PATH, map_location="cpu")
                    if hasattr(self.model, "eval"):
                        self.model.eval()
                    self.is_trained_model = True
                    self.model_version = f"torch-{os.path.basename(MODEL_PATH)}"
                elif DL_BACKEND == "tensorflow":
                    import tensorflow as tf
                    self.model = tf.keras.models.load_model(MODEL_PATH)
                    self.is_trained_model = True
                    self.model_version = f"tf-{os.path.basename(MODEL_PATH)}"
            except Exception as e:
                # Do not fabricate predictions; fall back transparently.
                print(f"[image_classifier] model load failed, using heuristic: {e}")
                self.model = None
                self.is_trained_model = False

    def preprocess(self, image_bytes: bytes):
        """Decode bytes into a normalized numpy array (224x224x3)."""
        import cv2
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (224, 224))
        return img.astype(np.float32) / 255.0

    def classify(self, image_bytes: bytes) -> Dict:
        """Run classification and return category, confidence, allScores."""
        img = self.preprocess(image_bytes)

        if self.is_trained_model and self.model is not None:
            scores = self._infer_trained(img)
        else:
            scores = self._heuristic(img)

        all_scores = {cat: float(round(scores[i], 4)) for i, cat in enumerate(SUPPORTED_CATEGORIES)}
        best_idx = int(np.argmax(scores))
        confidence = float(scores[best_idx])
        category = SUPPORTED_CATEGORIES[best_idx] if confidence >= CONFIDENCE_THRESHOLD else "other"

        return {
            "category": category,
            "confidence": round(confidence, 4),
            "allScores": all_scores,
            "modelVersion": self.model_version,
            "note": (
                "AI output is an automated assessment, not a confirmed environmental finding."
            ),
        }

    def _infer_trained(self, img):
        """Run inference with a loaded DL model. Returns a scores array."""
        if DL_BACKEND == "torchvision":
            import torch
            t = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0)
            with torch.no_grad():
                logits = self.model(t)
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            return probs
        elif DL_BACKEND == "tensorflow":
            probs = self.model.predict(np.expand_dims(img, 0), verbose=0)[0]
            return probs
        return self._heuristic(img)

    def _heuristic(self, img):
        """A transparent, non-learned baseline using color statistics.

        NOTE: This is NOT a trained model. It exists so the pipeline works
        end-to-end before a real model is provided. It should be replaced by
        a model evaluated on representative labelled images before any
        prediction is treated as useful.
        """
        # Mean per channel (R,G,B)
        means = img.reshape(-1, 3).mean(axis=0)
        # Saturation proxy: std across channels
        std = img.reshape(-1, 3).std(axis=0).mean()

        r, g, b = means
        scores = np.zeros(len(SUPPORTED_CATEGORIES), dtype=np.float32)

        # Oil spill: dark, low color variance, brownish/black
        darkness = 1 - (r + g + b) / 3
        scores[SUPPORTED_CATEGORIES.index("oil_spill")] = 0.3 * darkness + 0.1

        # Plastic pollution: bright, high saturation, whitish/blueish
        scores[SUPPORTED_CATEGORIES.index("plastic_pollution")] = 0.2 * (1 - darkness) + 0.15 * std

        # Marine debris: mid brightness
        scores[SUPPORTED_CATEGORIES.index("marine_debris")] = 0.15 + 0.1 * std

        # Coastal pollution: greenish/brownish tint
        scores[SUPPORTED_CATEGORIES.index("coastal_pollution")] = 0.2 * (g / (r + g + b + 1e-5)) + 0.1

        # Algal bloom: strong green dominance
        scores[SUPPORTED_CATEGORIES.index("algal_bloom")] = 0.3 * (g / (r + b + 1e-5)) + 0.1

        # Dead marine animals: reddish/brown
        scores[SUPPORTED_CATEGORIES.index("dead_marine_animals")] = 0.2 * (r / (g + b + 1e-5)) + 0.05

        # Other: baseline
        scores[SUPPORTED_CATEGORIES.index("other")] = 0.1

        # Normalize to a probability distribution
        scores = np.clip(scores, 0, 1)
        s = scores.sum()
        if s > 0:
            scores = scores / s
        else:
            scores = np.ones(len(SUPPORTED_CATEGORIES)) / len(SUPPORTED_CATEGORIES)
        return scores


classifier = HazardClassifier()
