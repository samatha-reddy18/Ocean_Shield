import HazardReport from '../models/HazardReport.js';

/**
 * Server-side rule-based duplicate detection used as a fallback when the AI
 * service is unavailable, and as the canonical scorer when computing
 * `possibleDuplicates` for a newly-submitted report.
 *
 * Signals (configurable):
 *   - geographic proximity (haversine distance <= DISTANCE_KM)
 *   - temporal proximity (|observationDate - candidate.observationDate| <= DAYS)
 *   - category match
 *   - textual similarity (Jaccard over tokenized descriptions)
 */
const DISTANCE_KM = parseFloat(process.env.DUP_DISTANCE_KM || '5');
const DAYS = parseFloat(process.env.DUP_DAYS || '3');
const GEO_WEIGHT = parseFloat(process.env.DUP_GEO_WEIGHT || '0.4');
const TIME_WEIGHT = parseFloat(process.env.DUP_TIME_WEIGHT || '0.2');
const CAT_WEIGHT = parseFloat(process.env.DUP_CAT_WEIGHT || '0.2');
const TEXT_WEIGHT = parseFloat(process.env.DUP_TEXT_WEIGHT || '0.2');
const THRESHOLD = parseFloat(process.env.DUP_THRESHOLD || '0.5');

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function tokenize(text = '') {
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'was',
    'for', 'with', 'near', 'by', 'this', 'that', 'it', 'we', 'i', 'saw',
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stop.has(t))
  );
}

function jaccard(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Score one candidate against a target report.
 * Returns { score, reasons[] }.
 */
export function scoreDuplicate(target, candidate) {
  const reasons = [];
  let score = 0;

  // Geographic
  const distKm = haversineKm(
    target.latitude,
    target.longitude,
    candidate.latitude,
    candidate.longitude
  );
  if (distKm <= DISTANCE_KM) {
    const geoScore = 1 - distKm / DISTANCE_KM;
    score += GEO_WEIGHT * geoScore;
    reasons.push(`within ${distKm.toFixed(2)} km`);
  }

  // Temporal
  if (target.observationDate && candidate.observationDate) {
    const diffDays =
      Math.abs(new Date(target.observationDate) - new Date(candidate.observationDate)) /
      (1000 * 60 * 60 * 24);
    if (diffDays <= DAYS) {
      const timeScore = 1 - diffDays / DAYS;
      score += TIME_WEIGHT * timeScore;
      reasons.push(`observed ${diffDays.toFixed(1)} days apart`);
    }
  }

  // Category
  if (target.category && target.category === candidate.category) {
    score += CAT_WEIGHT;
    reasons.push('same category');
  }

  // Text
  const textSim = jaccard(target.description, candidate.description);
  score += TEXT_WEIGHT * textSim;
  if (textSim > 0.2) reasons.push(`text similarity ${(textSim * 100).toFixed(0)}%`);

  return { score: Number(score.toFixed(3)), reasons };
}

/**
 * Find potential duplicates for a given report among all other reports.
 * Excludes the report itself and (optionally) reports by the same user.
 */
export async function findPotentialDuplicates(report, { excludeOwn = true } = {}) {
  const filter = { _id: { $ne: report._id } };
  if (excludeOwn && report.user) filter.user = { $ne: report.user };

  // Narrow the candidate set geographically + temporally to keep it cheap.
  filter.location = {
    $near: {
      $geometry: { type: 'Point', coordinates: [report.longitude, report.latitude] },
      $maxDistance: DISTANCE_KM * 2000, // generous outer ring in meters
    },
  };

  let candidates = [];
  try {
    candidates = await HazardReport.find(filter).limit(50).lean();
  } catch (err) {
    // Fallback if 2dsphere query fails (e.g. in some test setups)
    candidates = await HazardReport.find({ _id: { $ne: report._id } })
      .limit(50)
      .lean();
  }

  const matches = [];
  for (const c of candidates) {
    const { score, reasons } = scoreDuplicate(report, c);
    if (score >= THRESHOLD) {
      matches.push({ reportId: c._id, score, reasons });
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10);
}

export default { findPotentialDuplicates, scoreDuplicate, haversineKm };
