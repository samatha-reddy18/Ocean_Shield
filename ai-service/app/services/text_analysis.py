"""NLP extraction for hazard report descriptions.

Uses lightweight, dependency-free rule-based extraction so the service runs
without heavy transformer models. This extracts keywords, phrases, location
references, a short summary, and flags missing information.

A transformer-based summarizer (e.g. HuggingFace) can be plugged in later by
replacing `summarize()` and keeping the same return schema.
"""
import re
from typing import List, Dict

# Domain lexicon for keyword extraction
HAZARD_KEYWORDS = {
    "oil": "oil_spill",
    "slick": "oil_spill",
    "petroleum": "oil_spill",
    "sheen": "oil_spill",
    "tar": "oil_spill",
    "plastic": "plastic_pollution",
    "bottle": "plastic_pollution",
    "bag": "plastic_pollution",
    "wrapper": "plastic_pollution",
    "net": "marine_debris",
    "rope": "marine_debris",
    "debris": "marine_debris",
    "garbage": "marine_debris",
    "trash": "marine_debris",
    "sewage": "coastal_pollution",
    "chemical": "coastal_pollution",
    "discharge": "coastal_pollution",
    "runoff": "coastal_pollution",
    "algae": "algal_bloom",
    "algal": "algal_bloom",
    "bloom": "algal_bloom",
    "red tide": "algal_bloom",
    "fish": "dead_marine_animals",
    "whale": "dead_marine_animals",
    "turtle": "dead_marine_animals",
    "bird": "dead_marine_animals",
    "carcass": "dead_marine_animals",
    "dead": "dead_marine_animals",
}

# Location reference patterns (coastal features, directions, place indicators)
LOCATION_PATTERNS = [
    r"\b(?:near|off|along|alongside|beside|at|in|around)\s+([A-Z][a-zA-Z]{2,40}(?:\s+[A-Z][a-zA-Z]{2,40})?)",
    r"\b(beach|bay|coast|harbor|harbour|shore|port|river|estuary|strait|cove|cape|island)\b",
    r"\b(north|south|east|west|northeast|northwest|southeast|southwest)\s+(?:coast|of|shore)\b",
]

# Phrases that suggest evidence quality / urgency
EVIDENCE_PHRASES = [
    "observed", "witnessed", "spotted", "noticed",
    "smell", "odor", "colour", "color", "extent",
    "spreading", "large area", "small patch",
]

# Fields we expect in a complete report
EXPECTED_ELEMENTS = {
    "approximate size or extent": [r"\b(?:size|area|extent|metres|meters|km|wide|long|patch)\b"],
    "approximate time": [r"\b\d{1,2}:\d{2}\b", r"\b(?:morning|afternoon|evening|night|dawn|dusk)\b"],
    "weather or sea conditions": [r"\b(?:wind|wave|current|tide|weather|calm|rough)\b"],
    "wildlife impact": [r"\b(?:bird|fish|turtle|dolphin|whale|wildlife|animal)\b"],
    "potential source": [r"\b(?:source|vessel|ship|pipe|factory|discharge|origin)\b"],
}


def extract_keywords(description: str) -> List[str]:
    text = description.lower()
    found = set()
    for kw in HAZARD_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", text):
            found.add(kw)
    return sorted(found)


def extract_phrases(description: str) -> List[str]:
    text = description.lower()
    found = []
    for phrase in EVIDENCE_PHRASES:
        if phrase in text:
            found.append(phrase)
    return found


def extract_location_references(description: str) -> List[str]:
    found = set()
    for pattern in LOCATION_PATTERNS:
        for match in re.finditer(pattern, description, flags=re.IGNORECASE):
            found.add(match.group(0).strip())
    return sorted(found)


def identify_missing_info(description: str) -> List[str]:
    missing = []
    text = description.lower()
    for element, patterns in EXPECTED_ELEMENTS.items():
        if not any(re.search(p, text) for p in patterns):
            missing.append(element)
    return missing


def summarize(description: str, max_chars: int = 200) -> str:
    """A simple extractive summary: first sentence + top keyword context."""
    sentences = re.split(r"(?<=[.!?])\s+", description.strip())
    if not sentences:
        return description[:max_chars]
    first = sentences[0]
    keywords = extract_keywords(description)
    if keywords and len(first) < max_chars:
        kw_str = ", ".join(keywords[:5])
        return f"{first} (key terms: {kw_str})"[:max_chars]
    return first[:max_chars]


def analyze(description: str, category: str = None) -> Dict:
    keywords = extract_keywords(description)
    return {
        "keywords": keywords,
        "phrases": extract_phrases(description),
        "locationReferences": extract_location_references(description),
        "summary": summarize(description),
        "missingInfo": identify_missing_info(description),
        "suggestedCategory": (
            HAZARD_KEYWORDS.get(keywords[0]) if keywords and not category else None
        ),
    }
