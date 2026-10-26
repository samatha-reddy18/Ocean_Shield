import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_LABELS } from '../utils/format.js';

// Fix default marker icon path issues with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Build a colored marker icon per category
function categoryIcon(category) {
  const color = CATEGORY_COLORS[category] || '#06b6d4';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

export default function MapView({ reports = [], hotspots = [], center = [0, 0], zoom = 3, height = 480 }) {
  // Recenter roughly to the data if no explicit center provided
  const mapCenter =
    center && center[0] !== 0
      ? center
      : reports.length
      ? [reports[0].latitude, reports[0].longitude]
      : [20, 0];

  return (
    <MapContainer center={mapCenter} zoom={zoom} style={{ height, width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {reports.map((r) => (
        <Marker
          key={r._id}
          position={[r.latitude, r.longitude]}
          icon={categoryIcon(r.category)}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong>{r.title}</strong>
              <div style={{ marginTop: 4 }}>
                <span className={`badge badge-${r.verificationStatus}`} style={{ fontSize: 11 }}>
                  {STATUS_LABELS[r.verificationStatus] || r.verificationStatus}
                </span>{' '}
                <span className="badge badge-low" style={{ fontSize: 11 }}>
                  {CATEGORY_LABELS[r.category] || r.category}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
                {r.latitude?.toFixed(3)}, {r.longitude?.toFixed(3)}
              </div>
              <Link to={`/reports/${r._id}`} style={{ fontSize: 12, marginTop: 6, display: 'inline-block' }}>
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {hotspots.map((h, i) => (
        <CircleMarker
          key={`hs-${i}`}
          center={[h.latitude, h.longitude]}
          radius={Math.min(8 + h.count, 40)}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25 }}
        >
          <Tooltip>
            {h.count} reports within {h.radiusKm?.toFixed(1)} km
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
