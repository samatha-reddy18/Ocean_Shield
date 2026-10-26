"""Rule-based duplicate detection mirroring the Express backend logic.

Used when the Express backend forwards candidates for scoring. Returns the
candidates that exceed the configured similarity threshold.
"""
import math
import re
from typing import List, Dict, Any

from app.config import DUP_DISTANCE_KM, DUP_DAYS, DUP_THRESHOLD


def _to_rad(deg):
    return deg * math.pi / 180.0


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = _to_rad(lat2 - lat1)
    dlon = _to_rad(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(_to_rad(lat1)) * math.cos(_to_rad(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


_STOP = {
    "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "is", "was",
    "for", "with", "near", "by", "this", "that", "it", "we", "i", "saw",
}


def _tokens(text: str) -> set:
    if not text:
        return set()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return {t for t in cleaned.split() if len(t) > 2 and t not in _STOP}


def jaccard(a: str, b: str) -> float:
    A, B = _tokens(a), _tokens(b)
    if not A or not B:
        return 0.0
    inter = len(A & B)
    return inter / (len(A) + len(B) - inter)


def score(target: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
    reasons: List[str] = []
    score = 0.0

    # Geographic proximity (weight 0.4)
    geo_weight = 0.4
    if "latitude" in target and "longitude" in target and target.get("latitude") is not None:
        dist = haversine_km(
            target["latitude"], target["longitude"],
            candidate["latitude"], candidate["longitude"],
        )
        if dist <= DUP_DISTANCE_KM:
            score += geo_weight * (1 - dist / DUP_DISTANCE_KM)
            reasons.append(f"within {dist:.2f} km")

    # Temporal proximity (weight 0.2)
    time_weight = 0.2
    if target.get("observationDate") and candidate.get("observationDate"):
        from datetime import datetime
        try:
            d1 = datetime.fromisoformat(str(target["observationDate"]).replace("Z", ""))
            d2 = datetime.fromisoformat(str(candidate["observationDate"]).replace("Z", ""))
            diff_days = abs((d1 - d2).days)
            if diff_days <= DUP_DAYS:
                score += time_weight * (1 - diff_days / DUP_DAYS)
                reasons.append(f"observed {diff_days} days apart")
        except Exception:
            pass

    # Category match (weight 0.2)
    cat_weight = 0.2
    if target.get("category") and target["category"] == candidate.get("category"):
        score += cat_weight
        reasons.append("same category")

    # Text similarity (weight 0.2)
    text_weight = 0.2
    sim = jaccard(target.get("description", ""), candidate.get("description", ""))
    score += text_weight * sim
    if sim > 0.2:
        reasons.append(f"text similarity {int(sim * 100)}%")

    return {"reportId": candidate.get("reportId"), "score": round(score, 3), "reasons": reasons}


def find_duplicates(target: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    matches = []
    for c in candidates:
        result = score(target, c)
        if result["score"] >= DUP_THRESHOLD:
            matches.append(result)
    matches.sort(key=lambda m: m["score"], reverse=True)
    return matches[:10]
