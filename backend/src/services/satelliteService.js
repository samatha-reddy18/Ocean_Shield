import axios from 'axios';
import SatelliteObservation from '../models/SatelliteObservation.js';

/**
 * NASA Worldview / GIBS (Global Imagery Browse Services) integration.
 *
 * Unlike the previous Copernicus integration, GIBS imagery is a public,
 * no-authentication tile service. Imagery is served as live map tiles in the
 * standard {z}/{y}/{x} pyramid (Web Mercator, EPSG:3857), which Leaflet
 * consumes directly. A secondary Worldview Snapshots API provides downloadable
 * static images of a bounding box.
 *
 * GIBS imagery is a daily mosaic with a 3–24 hour lag depending on the layer.
 * It is NOT real-time. Imagery is described as "live" only when tiles are
 * actually rendered in the browser.
 */

const GIBS_BASE = process.env.GIBS_BASE_URL || 'https://gibs.earthdata.nasa.gov';
const WORLVIEW_SNAPSHOTS_URL =
  process.env.WORLVIEW_SNAPSHOTS_URL || 'https://wvs.earthdata.nasa.gov/api/v1/snapshot';

// Subdomains used for tile load balancing (GIBS supports a/b/c)
const SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Curated catalog of GIBS layers relevant to ocean and coastal hazard
 * monitoring. Each entry contains the metadata needed to build tile URLs and
 * to render legends. Keep this list small and hazard-relevant.
 *
 * tileMatrixSet: GIBS pyramid level for Web Mercator (GoogleMapsCompatible_LevelN).
 * maxNativeZoom: the highest zoom level this layer natively supports.
 * format: image/png or image/jpeg.
 */
/**
 * All layer IDs, tileMatrixSets and formats below are verified against the
 * GIBS WMTS capabilities endpoint and confirmed to return HTTP 200 tiles.
 */
export const GIBS_LAYERS = [
  {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    label: 'MODIS Terra — True Color',
    category: 'optical',
    description: 'Daily natural-color imagery from Terra. Best general coastal/ocean overview.',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxNativeZoom: 9,
    format: 'jpeg',
    opacity: 1.0,
  },
  {
    id: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
    label: 'MODIS Aqua — True Color',
    category: 'optical',
    description: 'Daily natural-color imagery from Aqua. Complementary overpass to Terra.',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxNativeZoom: 9,
    format: 'jpeg',
    opacity: 1.0,
  },
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    label: 'VIIRS SNPP — True Color (higher-res)',
    category: 'optical',
    description: 'Higher-resolution daily true color imagery from SNPP.',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxNativeZoom: 9,
    format: 'jpeg',
    opacity: 1.0,
  },
  {
    id: 'MODIS_Terra_L2_Chlorophyll_A',
    label: 'MODIS Terra — Chlorophyll-a',
    category: 'ocean_color',
    description: 'Chlorophyll-a concentration from Terra. Elevated values indicate algal blooms.',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    format: 'png',
    opacity: 0.85,
  },
  {
    id: 'MODIS_Aqua_L2_Chlorophyll_A',
    label: 'MODIS Aqua — Chlorophyll-a',
    category: 'ocean_color',
    description: 'Chlorophyll-a concentration from Aqua. Best combined with Terra layer.',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    format: 'png',
    opacity: 0.85,
  },
  {
    id: 'VIIRS_NOAA20_Chlorophyll_a',
    label: 'VIIRS NOAA-20 — Chlorophyll-a',
    category: 'ocean_color',
    description: 'Chlorophyll-a from the newer NOAA-20 / JPSS-1 satellite.',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    format: 'png',
    opacity: 0.85,
  },
  {
    id: 'OCI_PACE_Chlorophyll_a',
    label: 'PACE OCI — Chlorophyll-a (latest)',
    category: 'ocean_color',
    description: 'Chlorophyll-a from PACE/OCI, NASA\'s newest ocean-color sensor (launched 2024).',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    format: 'png',
    opacity: 0.85,
  },
  {
    id: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
    label: 'Sea Surface Temperature — MUR (GHRSST)',
    category: 'sst',
    description: 'Multi-scale Ultra-high Resolution SST. Useful for ocean dynamics and HAB context.',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    format: 'png',
    opacity: 0.85,
  },
  {
    id: 'VIIRS_SNPP_DayNightBand_At_Sensor_Radiance',
    label: 'VIIRS — Day/Night Band (night lights)',
    category: 'night',
    description: 'Nighttime radiance. Can reveal vessel activity and lit coastal areas.',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxNativeZoom: 8,
    format: 'png',
    opacity: 1.0,
  },
];

// Fast lookup by layer id
const LAYER_BY_ID = new Map(GIBS_LAYERS.map((l) => [l.id, l]));

/**
 * The most recent date GIBS is likely to have imagery for. GIBS generally lags
 * 1–3 days. We subtract a safety margin so the default date shows imagery.
 */
export function defaultImageryDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Validate and normalize a YYYY-MM-DD date string. Falls back to the default
 * GIBS date if missing or invalid.
 */
function normalizeDate(dateStr) {
  if (!dateStr) return defaultImageryDate();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return defaultImageryDate();
  // Clamp to a reasonable GIBS range (GIBS coverage begins ~2000; Worldview-era daily ~2012+)
  const min = new Date('2000-01-01');
  const max = new Date();
  max.setUTCDate(max.getUTCDate() - 1);
  if (d < min) return min.toISOString().slice(0, 10);
  if (d > max) return max.toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * Build the GIBS tile URL template for a Leaflet L.tileLayer.
 * Leaflet replaces {z}/{x}/{y}; we keep GIBS's {s} subdomain placeholder and
 * {time} is baked in to a concrete date.
 */
export function getTileUrl(layerId, dateStr) {
  const layer = LAYER_BY_ID.get(layerId);
  if (!layer) {
    const err = new Error(`Unknown GIBS layer: ${layerId}`);
    err.code = 'UNKNOWN_LAYER';
    throw err;
  }
  const time = normalizeDate(dateStr);
  const ext = layer.format; // jpeg or png
  return {
    layer,
    date: time,
    url: `${GIBS_BASE}/wmts/epsg3857/best/${layer.id}/default/${time}/${layer.tileMatrixSet}/{z}/{y}/{x}.${ext}`,
    // Leaflet-friendly template with subdomain rotation:
    urlTemplate: `${GIBS_BASE.replace('://', '://{s}.')}/wmts/epsg3857/best/${layer.id}/default/${time}/${layer.tileMatrixSet}/{z}/{y}/{x}.${ext}`,
    subdomains: SUBDOMAINS,
    maxNativeZoom: layer.maxNativeZoom,
    format: layer.format,
  };
}

/**
 * Return the curated layer catalog.
 */
export function getLayerCatalog() {
  return {
    source: 'NASA GIBS / Worldview',
    baseUrl: GIBS_BASE,
    defaultDate: defaultImageryDate(),
    layers: GIBS_LAYERS,
    note: 'GIBS imagery is a daily mosaic, not real-time. Availability depends on acquisition time, resolution, and environmental conditions (e.g. clouds block optical layers).',
  };
}

/**
 * Fetch a downloadable snapshot image for a bounding box via the Worldview
 * Snapshots API. Returns a binary image (buffer + content-type) or an error.
 *
 * bbox: [minLon, minLat, maxLon, maxLat]
 * layers: array of GIBS layer ids (wrapped/overlay order)
 */
export async function getSnapshot({ layers = [], date, bbox, width = 1024, height = 1024 }) {
  if (!bbox || bbox.length !== 4 || bbox.some((n) => isNaN(n))) {
    throw new Error('bbox must be [minLon, minLat, maxLon, maxLat]');
  }
  if (!layers.length) throw new Error('At least one layer is required');

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const time = normalizeDate(date);
  const layersParam = layers
    .filter((id) => LAYER_BY_ID.has(id))
    .map((id, idx) => `LAYERS=${encodeURIComponent(id)}`)
    .join('&');

  // First layer is the base; subsequent layers are overlaid (CRITICAL=true wraps the base)
  const parts = [
    `REQUEST=GetSnapshot`,
    layers.map((id) => `LAYERS=${encodeURIComponent(id)}`).join('&'),
    `CRITICAL=${encodeURIComponent(layers[0])}`,
    `BBOX=${minLon},${minLat},${maxLon},${maxLat}`,
    `FORMAT=image/jpeg`,
    `WIDTH=${width}`,
    `HEIGHT=${height}`,
  ];

  const url = `${WORLVIEW_SNAPSHOTS_URL}?${parts.join('&')}`;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 15 * 1024 * 1024,
    });
    return {
      available: true,
      contentType: response.headers['content-type'] || 'image/jpeg',
      buffer: Buffer.from(response.data),
      date: time,
      layers,
      bbox,
      url,
    };
  } catch (err) {
    return {
      available: false,
      message: 'Worldview Snapshot API error: ' + (err.response?.status ? `HTTP ${err.response.status}` : err.message),
      url,
    };
  }
}

/**
 * Persist a record of a genuinely-fetched snapshot (optional audit trail).
 */
export async function persistObservation({ layers, date, bbox, user }) {
  const productId = `WV-${date}-${layers.join('|')}-${bbox.join('_')}`.slice(0, 120);
  return SatelliteObservation.findOneAndUpdate(
    { productId },
    {
      productId,
      satellite: 'gibs-worldview',
      title: `Worldview snapshot: ${layers.join(', ')}`,
      acquisitionDate: date ? new Date(date) : null,
      requestedBy: user || null,
      status: 'available',
    },
    { upsert: true, new: true }
  ).catch(() => null);
}

export default {
  getLayerCatalog,
  getTileUrl,
  getSnapshot,
  persistObservation,
  defaultImageryDate,
};
