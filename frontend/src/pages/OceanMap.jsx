import { useEffect, useState, useMemo } from 'react';
import { Layers, MapPin, TrendingUp, Filter } from 'lucide-react';
import MapView from '../components/MapView.jsx';
import { mapApi } from '../services/mapService.js';
import { errorMessage } from '../services/api.js';
import { CATEGORY_OPTIONS, CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS } from '../utils/format.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function OceanMap() {
  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHotspots, setShowHotspots] = useState(true);

  const [filters, setFilters] = useState({
    category: '',
    verificationStatus: '',
    startDate: '',
    endDate: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        category: filters.category || undefined,
        verificationStatus: filters.verificationStatus || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const [mapData, hsData] = await Promise.all([
        mapApi.getMapReports(params),
        mapApi.getHotspots({ startDate: params.startDate, endDate: params.endDate }),
      ]);
      setReports(mapData.reports);
      setHotspots(hsData.hotspots || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [
    filters.category,
    filters.verificationStatus,
    filters.startDate,
    filters.endDate,
  ]);

  const legendItems = useMemo(
    () => CATEGORY_OPTIONS.map((c) => ({ ...c, color: CATEGORY_COLORS[c.value] })),
    []
  );

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="flex items-center gap-2"><MapPin size={24} color="var(--cyan-500)" /> Ocean Hazard Map</h1>
        <p>Explore reported environmental incidents geographically. Hotspots show report concentrations, not confirmed contamination.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) 1fr', gap: '1.5rem' }} data-map-grid>
        {/* Filters */}
        <aside className="flex-col gap-3">
          <div className="card">
            <h3 className="flex items-center gap-2 mb-3"><Filter size={18} color="var(--cyan-500)" /> Filters</h3>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={filters.verificationStatus} onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">From date</label>
              <input type="date" className="form-input" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">To date</label>
              <input type="date" className="form-input" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>

            <button className="btn btn-ghost" onClick={() => setFilters({ category: '', verificationStatus: '', startDate: '', endDate: '' })}>
              Clear filters
            </button>
          </div>

          {/* Legend */}
          <div className="card">
            <h3 className="flex items-center gap-2 mb-3"><Layers size={18} color="var(--cyan-500)" /> Legend</h3>
            <div className="flex-col gap-2">
              {legendItems.map((l) => (
                <div key={l.value} className="flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50% 50% 50% 0', background: l.color, display: 'inline-block', transform: 'rotate(-45deg)', border: '1px solid white' }} />
                  {l.label}
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(239,68,68,0.4)', border: '1px solid #ef4444', display: 'inline-block' }} />
                Hotspot (report density)
              </div>
            </div>
          </div>

          {/* Hotspot toggle */}
          <div className="card">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
              <TrendingUp size={16} color="var(--red-500)" /> Show hotspots
            </label>
            <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
              {hotspots.length} hotspot cluster{hotspots.length !== 1 ? 's' : ''} detected.
            </p>
          </div>
        </aside>

        {/* Map */}
        <div>
          {loading ? (
            <LoadingSpinner />
          ) : reports.length === 0 ? (
            <div className="card empty-state" style={{ height: 480 }}>
              <MapPin size={40} />
              <h3>No reports to display</h3>
              <p>No reports match the current filters, or none have been submitted yet.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <MapView
                reports={reports}
                hotspots={showHotspots ? hotspots : []}
                height={540}
                zoom={2}
              />
            </div>
          )}
          <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
            Showing {reports.length} report{reports.length !== 1 ? 's' : ''} on the map.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          [data-map-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
