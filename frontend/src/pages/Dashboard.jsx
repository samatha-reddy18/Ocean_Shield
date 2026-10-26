import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, Plus, MapPin, TrendingUp, RefreshCw } from 'lucide-react';
import { reportApi } from '../services/reportService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { CATEGORY_LABELS, formatDate } from '../utils/format.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await reportApi.getMyReports({ limit: 5 });
      setReports(data.items);
      setStats({
        total: data.total,
        pending: data.items.filter((r) => r.verificationStatus === 'pending').length,
        verified: data.items.filter((r) => r.verificationStatus === 'verified').length,
        rejected: data.items.filter((r) => r.verificationStatus === 'rejected').length,
      });
      setLastRefreshed(new Date());
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh when a report this user owns is updated OR a new notification arrives
  useEffect(() => {
    const unsub1 = subscribe('report_updated', () => load(true));
    const unsub2 = subscribe('notification', () => load(true));
    return () => { unsub1(); unsub2(); };
  }, [subscribe, load]);

  if (loading) return <LoadingSpinner fullPage />;

  const cards = [
    { label: 'My Reports', value: stats?.total ?? 0, icon: FileText, color: '#06b6d4' },
    { label: 'Pending Review', value: stats?.pending ?? 0, icon: Clock, color: '#f59e0b' },
    { label: 'Verified', value: stats?.verified ?? 0, icon: CheckCircle, color: '#22c55e' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, color: '#ef4444' },
  ];

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p>
            Here's an overview of your reporting activity.
            {lastRefreshed && (
              <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 8 }}>
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => load()} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <Link to="/report-hazard" className="btn btn-primary">
            <Plus size={18} /> New Report
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${c.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.icon size={22} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{c.value}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3>Recent reports</h3>
          <Link to="/my-reports" className="text-muted" style={{ fontSize: '0.9rem' }}>View all →</Link>
        </div>

        {reports.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <p>You haven't submitted any reports yet.</p>
            <Link to="/report-hazard" className="btn btn-primary mt-4">
              <Plus size={18} /> Submit your first report
            </Link>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {reports.map((r) => (
              <Link
                key={r._id}
                to={`/reports/${r._id}`}
                className="flex items-center justify-between"
                style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: 'var(--navy-900)' }}>{r.title}</strong>
                  <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                    <MapPin size={12} /> {r.latitude?.toFixed(3)}, {r.longitude?.toFixed(3)}
                    <span>•</span>
                    <span>{CATEGORY_LABELS[r.category]}</span>
                    <span>•</span>
                    <span>{formatDate(r.observationDate)}</span>
                  </div>
                </div>
                <StatusBadge status={r.verificationStatus} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
