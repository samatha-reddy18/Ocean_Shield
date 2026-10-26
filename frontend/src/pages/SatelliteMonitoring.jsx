import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, useMap,
  LayersControl, ScaleControl, Marker, Popup,
} from 'react-leaflet';
import {
  Satellite, Layers, Calendar, Download, Info,
  AlertCircle, Loader2, MapPin, LocateFixed, Search, Navigation,
} from 'lucide-react';
import L from 'leaflet';
import { satelliteApi } from '../services/satelliteService.js';
import { errorMessage } from '../services/api.js';
import { formatDate } from '../utils/format.js';

// Fix default marker icons for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom teal pin for the jumped-to location
const locationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:50% 50% 50% 0;
    background:#06b6d4;transform:rotate(-45deg);
    border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -24],
});

// Build a GIBS WMTS tile URL template for Leaflet.
function buildGibsUrl(baseUrl, layer, date) {
  const host = baseUrl.replace('://', '://{s}.');
  return `${host}/wmts/epsg3857/best/${layer.id}/default/${date}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.format}`;
}

// ---- Map control sub-components ----------------------------------------

// Expose the map instance via a ref callback.
function MapRef({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

// Fly the map to given [lat, lng] at a given zoom.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 8, { duration: 1.4 });
  }, [target, map]);
  return null;
}

// ---- Geocoding via Nominatim (no API key needed) -------------------------
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.length) throw new Error(`No results found for "${query}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
}

// ---- Main component -------------------------------------------------------
export default function SatelliteMonitoring() {
  const [catalog, setCatalog]       = useState(null);
  const [layerId, setLayerId]       = useState('');
  const [date, setDate]             = useState('');
  const [opacity, setOpacity]       = useState(1.0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [snapshot, setSnapshot]     = useState(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  // Location state
  const [lat, setLat]               = useState('');
  const [lng, setLng]               = useState('');
  const [placeName, setPlaceName]   = useState('');
  const [geoError, setGeoError]     = useState('');
  const [geoBusy, setGeoBusy]       = useState(false);
  const [pinLabel, setPinLabel]     = useState('');
  const [flyTarget, setFlyTarget]   = useState(null); // { lat, lng, zoom }
  const [markerPos, setMarkerPos]   = useState(null); // [lat, lng]

  const mapRef = useRef(null);

  // ---- helpers ----
  const jumpToCoords = useCallback((latVal, lngVal, label = '', zoom = 8) => {
    const la = parseFloat(latVal);
    const lo = parseFloat(lngVal);
    if (isNaN(la) || la < -90 || la > 90) { setGeoError('Latitude must be between -90 and 90'); return; }
    if (isNaN(lo) || lo < -180 || lo > 180) { setGeoError('Longitude must be between -180 and 180'); return; }
    setGeoError('');
    setLat(String(la));
    setLng(String(lo));
    setPinLabel(label || `${la.toFixed(4)}, ${lo.toFixed(4)}`);
    setMarkerPos([la, lo]);
    setFlyTarget({ lat: la, lng: lo, zoom });
  }, []);

  const handleManualJump = (e) => {
    e.preventDefault();
    jumpToCoords(lat, lng, `${lat}, ${lng}`);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoBusy(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        jumpToCoords(pos.coords.latitude, pos.coords.longitude, 'My location', 9);
      },
      () => { setGeoBusy(false); setGeoError('Could not get your location. Please enter coordinates manually.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePlaceSearch = async (e) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    setGeoBusy(true);
    setGeoError('');
    try {
      const result = await geocode(placeName.trim());
      setLat(result.lat.toFixed(6));
      setLng(result.lng.toFixed(6));
      jumpToCoords(result.lat, result.lng, result.displayName, 8);
    } catch (err) {
      setGeoError(err.message);
    } finally {
      setGeoBusy(false);
    }
  };

  // ---- catalog load ----
  useEffect(() => {
    (async () => {
      try {
        const data = await satelliteApi.getLayers();
        setCatalog(data);
        setDate(data.defaultDate);
        if (data.layers?.length) setLayerId(data.layers[0].id);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedLayer = catalog?.layers?.find((l) => l.id === layerId) || null;
  const gibsUrl = catalog && selectedLayer
    ? buildGibsUrl(catalog.baseUrl, selectedLayer, date)
    : null;
  const layerKey = `${layerId}-${date}`;

  // ---- snapshot ----
  const handleSnapshot = useCallback(async () => {
    if (!mapRef.current || !selectedLayer) return;
    setSnapshotBusy(true);
    setError('');
    setSnapshot(null);
    try {
      const b = mapRef.current.getBounds();
      const bbox = [
        Math.max(-180, +b.getWest().toFixed(4)),
        Math.max(-90,  +b.getSouth().toFixed(4)),
        Math.min(180,  +b.getEast().toFixed(4)),
        Math.min(90,   +b.getNorth().toFixed(4)),
      ];
      const result = await satelliteApi.fetchSnapshot({ layers: [selectedLayer.id], date, bbox });
      setSnapshot(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSnapshotBusy(false);
    }
  }, [selectedLayer, date]);

  // ---- loading screen ----
  if (loading) {
    return (
      <div className="container" style={{ paddingBottom: '2rem' }}>
        <div className="card flex items-center gap-3">
          <Loader2 className="spinner" size={20} />
          <span className="text-muted">Loading NASA GIBS imagery catalog…</span>
        </div>
      </div>
    );
  }

  // ---- render ----
  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="flex items-center gap-2">
          <Satellite size={24} color="var(--cyan-500)" /> Satellite Monitoring
        </h1>
        <p>Explore NASA Worldview imagery (GIBS) — daily satellite mosaics rendered live. Navigate to any location by coordinates, place name, or GPS.</p>
      </div>

      <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
        <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        GIBS imagery is a daily mosaic (1–3 day lag). Optical layers are blocked by cloud cover. Imagery is shown live only when tiles render in the map.
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={14} style={{ verticalAlign: 'middle' }} /> {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.5rem' }} data-sat-grid>

        {/* ---- Left panel ---- */}
        <div className="flex-col gap-3">

          {/* Layer + date */}
          <div className="card">
            <h3 className="flex items-center gap-2 mb-3">
              <Layers size={18} color="var(--cyan-500)" /> Imagery Layer
            </h3>

            <div className="form-group">
              <label className="form-label">Layer</label>
              <select className="form-select" value={layerId} onChange={(e) => setLayerId(e.target.value)}>
                {catalog?.layers?.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted" />
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  min="2000-01-01"
                  max={catalog?.defaultDate}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <span className="form-hint">Latest ≈ {catalog?.defaultDate}. Daily coverage back to ~2012.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Opacity: {Math.round(opacity * 100)}%</label>
              <input
                type="range" min="0" max="100"
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(parseInt(e.target.value, 10) / 100)}
                style={{ width: '100%' }}
              />
            </div>

            {selectedLayer && (
              <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '0.65rem 0.85rem', fontSize: '0.82rem' }}>
                <strong>{selectedLayer.label}</strong>
                <div className="text-muted mt-2">{selectedLayer.description}</div>
              </div>
            )}
          </div>

          {/* ---- Location panel ---- */}
          <div className="card">
            <h3 className="flex items-center gap-2 mb-3">
              <MapPin size={18} color="var(--cyan-500)" /> Navigate to Location
            </h3>

            {geoError && (
              <div className="alert alert-error" style={{ fontSize: '0.82rem', padding: '0.5rem 0.7rem', marginBottom: 10 }}>
                {geoError}
              </div>
            )}

            {/* GPS button */}
            <button
              className="btn btn-secondary full-width mb-3"
              onClick={handleUseMyLocation}
              disabled={geoBusy}
            >
              <LocateFixed size={16} />
              {geoBusy ? 'Locating…' : 'Use my GPS location'}
            </button>

            {/* Search by place name */}
            <form onSubmit={handlePlaceSearch} style={{ marginBottom: '1rem' }}>
              <label className="form-label">Search by place name</label>
              <div className="flex gap-2">
                <input
                  className="form-input"
                  placeholder="e.g. Bay of Bengal, Mumbai, Red Sea"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" type="submit" disabled={geoBusy || !placeName.trim()}>
                  <Search size={16} />
                </button>
              </div>
              <span className="form-hint">Powered by OpenStreetMap Nominatim. No API key required.</span>
            </form>

            {/* Manual lat/lon */}
            <form onSubmit={handleManualJump}>
              <label className="form-label">Manual coordinates</label>
              <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Latitude"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Longitude"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-secondary full-width"
                disabled={!lat || !lng}
              >
                <Navigation size={16} /> Go to coordinates
              </button>
            </form>

            {/* Current pin info */}
            {markerPos && (
              <div style={{ marginTop: 12, background: 'var(--gray-100)', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                <div className="flex items-center gap-2">
                  <MapPin size={14} color="var(--cyan-500)" />
                  <strong>Pinned location</strong>
                </div>
                <div className="text-muted mt-2" style={{ wordBreak: 'break-word' }}>{pinLabel}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                  {markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}
                </div>
                <button
                  className="btn btn-ghost mt-2"
                  style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem', color: 'var(--red-500)' }}
                  onClick={() => { setMarkerPos(null); setPinLabel(''); setLat(''); setLng(''); }}
                >
                  Clear pin
                </button>
              </div>
            )}
          </div>

          {/* Snapshot button */}
          <div className="card">
            <button
              className="btn btn-primary full-width"
              onClick={handleSnapshot}
              disabled={snapshotBusy || !selectedLayer}
            >
              <Download size={16} />
              {snapshotBusy ? 'Capturing…' : 'Download snapshot (current view)'}
            </button>
            <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
              Captures the current map viewport as a JPEG via the Worldview Snapshots API.
            </p>
          </div>

          {/* Snapshot result */}
          {snapshot && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Snapshot captured</h3>
              <img src={snapshot.url} alt="GIBS snapshot" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
              <a
                href={snapshot.url}
                download={`gibs-${selectedLayer?.id}-${date}.jpg`}
                className="btn btn-secondary full-width"
              >
                <Download size={16} /> Save image
              </a>
              <p className="text-muted mt-2" style={{ fontSize: '0.78rem' }}>
                {selectedLayer?.label} • {date}
              </p>
            </div>
          )}
        </div>

        {/* ---- Map ---- */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {gibsUrl ? (
              <MapContainer
                center={[20, 0]}
                zoom={3}
                minZoom={2}
                maxZoom={12}
                style={{ height: 600, width: '100%', background: '#0a2540' }}
                worldCopyJump
              >
                <MapRef onReady={(m) => { mapRef.current = m; }} />
                <FlyTo target={flyTarget} />
                <ScaleControl position="bottomleft" />

                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                      subdomains={['a', 'b', 'c']}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Dark base">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; CARTO &copy; OpenStreetMap'
                      subdomains={['a', 'b', 'c', 'd']}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {/* GIBS satellite imagery */}
                <TileLayer
                  key={layerKey}
                  url={gibsUrl}
                  subdomains={['a', 'b', 'c']}
                  attribution='Imagery &copy; NASA GIBS / Worldview'
                  maxNativeZoom={selectedLayer?.maxNativeZoom || 9}
                  maxZoom={12}
                  opacity={opacity}
                  noWrap
                />

                {/* Location marker */}
                {markerPos && (
                  <Marker position={markerPos} icon={locationIcon}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <strong>{pinLabel}</strong>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                          {markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}
                        </div>
                        <div style={{ fontSize: 12, color: '#06b6d4', marginTop: 4 }}>
                          Viewing: {selectedLayer?.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Date: {date}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div className="empty-state" style={{ height: 600 }}>
                <Satellite size={40} />
                <p>Select a layer to view imagery.</p>
              </div>
            )}
          </div>

          {/* Status bar below the map */}
          <div
            className="flex items-center justify-between mt-2 text-muted"
            style={{ fontSize: '0.82rem', flexWrap: 'wrap', gap: '0.5rem' }}
          >
            <span>
              <strong>{selectedLayer?.label}</strong> — {formatDate(date)}
            </span>
            {markerPos && (
              <span className="flex items-center gap-2">
                <MapPin size={12} color="var(--cyan-500)" />
                Pin: {markerPos[0].toFixed(4)}, {markerPos[1].toFixed(4)}
              </span>
            )}
            <span>Pan &amp; zoom freely, then click "Download snapshot"</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          [data-sat-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
