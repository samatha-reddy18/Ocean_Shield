import { getLayerCatalog, getTileUrl, getSnapshot, persistObservation } from '../services/satelliteService.js';

// GET /api/satellite/layers
// Returns the curated GIBS layer catalog + the default imagery date.
export async function getLayers(_req, res) {
  res.json(getLayerCatalog());
}

// GET /api/satellite/tiles?layer=<id>&date=<YYYY-MM-DD>
// Returns the GIBS tile URL template for a Leaflet L.tileLayer.
export async function getTiles(req, res) {
  const { layer, date } = req.query;
  if (!layer) {
    return res.status(400).json({ message: 'layer query parameter is required' });
  }
  try {
    const result = getTileUrl(layer, date);
    res.json(result);
  } catch (err) {
    if (err.code === 'UNKNOWN_LAYER') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

// GET /api/satellite/snapshot?layers=id1,id2&date=YYYY-MM-DD&bbox=minLon,minLat,maxLon,maxLat&width=&height=
// Proxies a downloadable snapshot image from the Worldview Snapshots API.
export async function getSatelliteSnapshot(req, res) {
  const { layers, date, bbox, width, height } = req.query;

  if (!bbox) {
    return res.status(400).json({ message: 'bbox query parameter is required (minLon,minLat,maxLon,maxLat)' });
  }
  const bboxArr = String(bbox)
    .split(',')
    .map((v) => parseFloat(v));
  if (bboxArr.length !== 4 || bboxArr.some(isNaN)) {
    return res.status(400).json({ message: 'bbox must be minLon,minLat,maxLon,maxLat' });
  }

  const layerList = layers ? String(layers).split(',').map((l) => l.trim()).filter(Boolean) : [];
  if (!layerList.length) {
    return res.status(400).json({ message: 'layers query parameter is required' });
  }

  try {
    const result = await getSnapshot({
      layers: layerList,
      date,
      bbox: bboxArr,
      width: width ? parseInt(width, 10) : 1024,
      height: height ? parseInt(height, 10) : 1024,
    });

    if (!result.available) {
      return res.status(502).json({ message: result.message });
    }

    // Persist a record of the genuinely-fetched snapshot
    if (req.user) {
      persistObservation({
        layers: layerList,
        date: result.date,
        bbox: bboxArr,
        user: req.user._id,
      }).catch(() => null);
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);
  } catch (err) {
    res.status(500).json({ message: 'Snapshot error: ' + err.message });
  }
}

export default { getLayers, getTiles, getSatelliteSnapshot };
