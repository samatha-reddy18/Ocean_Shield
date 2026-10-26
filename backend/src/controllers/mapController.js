import HazardReport from '../models/HazardReport.js';

// GET /api/map/reports — lightweight report data for map markers
export async function getMapReports(req, res) {
  const { category, verificationStatus, startDate, endDate } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (startDate || endDate) {
    filter.observationDate = {};
    if (startDate) filter.observationDate.$gte = new Date(startDate);
    if (endDate) filter.observationDate.$lte = new Date(endDate);
  }

  const reports = await HazardReport.find(filter)
    .select(
      'reportId title category latitude longitude verificationStatus aiStatus observationDate createdAt priority'
    )
    .limit(2000)
    .lean();

  res.json({ count: reports.length, reports });
}

// GET /api/map/hotspots — report-density grid for hotspot visualization
// Uses a geospatial bucket aggregation to estimate concentrations of reports.
export async function getHotspots(req, res) {
  const { radiusKm = 5, startDate, endDate } = req.query;
  const radiusMeters = Math.max(parseFloat(radiusKm) * 1000, 500);

  const match = {};
  if (startDate || endDate) {
    match.observationDate = {};
    if (startDate) match.observationDate.$gte = new Date(startDate);
    if (endDate) match.observationDate.$lte = new Date(endDate);
  }

  // Bucket by proximity using $bucketGeo; falls back to manual clustering.
  const pipeline = [
    { $match: { ...match, location: { $exists: true } } },
    {
      $bucketGeo: {
        groupBy: '$location',
        buckets: { bucketSize: radiusMeters, output: { count: { $sum: 1 }, avgLat: { $avg: '$latitude' }, avgLon: { $avg: '$longitude' } } },
      },
    },
  ];

  let buckets = [];
  try {
    buckets = await HazardReport.aggregate(pipeline);
  } catch (err) {
    // Fallback: simple proximity clustering in JS
    buckets = manualHotspots(await HazardReport.find(match).select('latitude longitude').lean(), radiusMeters);
  }

  const hotspots = buckets
    .filter((b) => b.count > 1)
    .map((b) => ({
      latitude: b.avgLat ?? b.center?.coordinates?.[1],
      longitude: b.avgLon ?? b.center?.coordinates?.[0],
      count: b.count,
      radiusKm: radiusMeters / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  res.json({
    note: 'Hotspots represent concentrations of submitted reports, not confirmed contamination.',
    radiusKm: radiusMeters / 1000,
    hotspots,
  });
}

function manualHotspots(points, radiusMeters) {
  // Simple grid-based clustering fallback
  const kmPerDeg = 111;
  const cellDeg = radiusMeters / 1000 / kmPerDeg;
  const grid = new Map();
  for (const p of points) {
    const key = `${Math.round(p.latitude / cellDeg)}_${Math.round(p.longitude / cellDeg)}`;
    if (!grid.has(key)) grid.set(key, { latSum: 0, lonSum: 0, count: 0 });
    const cell = grid.get(key);
    cell.latSum += p.latitude;
    cell.lonSum += p.longitude;
    cell.count += 1;
  }
  return Array.from(grid.values()).map((c) => ({
    count: c.count,
    avgLat: c.latSum / c.count,
    avgLon: c.lonSum / c.count,
  }));
}

export default { getMapReports, getHotspots };
