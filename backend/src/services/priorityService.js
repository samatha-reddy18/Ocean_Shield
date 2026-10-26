import { haversineKm } from './duplicateService.js';

/**
 * Rule-based priority scoring for reports (Module 11).
 *
 * Priority scores SUPPORT administrative decisions; they do NOT establish
 * that an incident is real or dangerous.
 *
 * Inputs:
 *   - evidence completeness (image present + description length)
 *   - administrator-assigned severity (high weights more)
 *   - number of related (nearby) reports
 *   - reports from designated sensitive areas
 *
 * Output: { score, level } where level is 'low' | 'medium' | 'high'
 */

const SENSITIVE_AREAS = (process.env.SENSITIVE_AREAS || '')
  .split('|')
  .filter(Boolean)
  .map((s) => s.split(',').map(Number));

const HIGH_THRESHOLD = parseFloat(process.env.PRIORITY_HIGH || '0.7');
const MEDIUM_THRESHOLD = parseFloat(process.env.PRIORITY_MEDIUM || '0.4');

/**
 * Determine if a coordinate falls within any configured sensitive area radius.
 */
export function inSensitiveArea(latitude, longitude) {
  if (!SENSITIVE_AREAS.length) return false;
  for (const [lat, lon, radiusKm] of SENSITIVE_AREAS) {
    if (haversineKm(latitude, longitude, lat, lon) <= radiusKm) return true;
  }
  return false;
}

function severityWeight(severity) {
  return { unassigned: 0, low: 0.2, medium: 0.5, high: 0.9 }[severity] ?? 0;
}

/**
 * Compute priority score for a report.
 * relatedCount = number of nearby reports (caller-supplied).
 */
export function computePriority(report, relatedCount = 0) {
  let score = 0;

  // Evidence completeness (images + description length), weight 0.3
  const hasImage = Array.isArray(report.images) && report.images.length > 0;
  const descLen = (report.description || '').length;
  const completeness = (hasImage ? 0.6 : 0) + Math.min(descLen / 500, 1) * 0.4;
  score += 0.3 * completeness;

  // Severity assigned by admin, weight 0.3
  score += 0.3 * severityWeight(report.severity || 'unassigned');

  // Related reports (corroborating evidence), weight 0.2
  score += 0.2 * Math.min(relatedCount / 5, 1);

  // Sensitive area, weight 0.2
  if (report.isSensitiveArea || inSensitiveArea(report.latitude, report.longitude)) {
    score += 0.2;
  }

  score = Math.min(Number(score.toFixed(3)), 1);

  let level = 'low';
  if (score >= HIGH_THRESHOLD) level = 'high';
  else if (score >= MEDIUM_THRESHOLD) level = 'medium';

  return { score, level };
}

/**
 * Recompute and persist priority for a report.
 * relatedCount is computed from nearby reports within DUP_DISTANCE_KM * 2.
 */
export async function recalculatePriority(report) {
  const HazardReport = (await import('../models/HazardReport.js')).default;
  const nearby = await HazardReport.countDocuments({
    _id: { $ne: report._id },
    user: { $ne: report.user },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [report.longitude, report.latitude] },
        $maxDistance: 10000,
      },
    },
  }).catch(() => 0);

  const { score, level } = computePriority(report, nearby);
  report.priority = level;
  report.priorityScore = score;
  report.isSensitiveArea = inSensitiveArea(report.latitude, report.longitude);
  await report.save();
  return { score, level };
}

export default { computePriority, recalculatePriority, inSensitiveArea };
