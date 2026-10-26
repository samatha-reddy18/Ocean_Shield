import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { FileText, Clock, CheckCircle, XCircle, Users, AlertTriangle, Shield, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/adminService.js';
import { errorMessage } from '../services/api.js';
import { CATEGORY_LABELS, STATUS_LABELS, formatDate, formatDateTime } from '../utils/format.js';
import StatusBadge, { AiStatusBadge, PriorityBadge } from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';

const PIE_COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#64748b'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState({ items: [], total: 0, pages: 1 });
  const [reviewLogs, setReviewLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionId, setActionId] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { report, type }
  const { subscribe } = useRealtime();
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, rev] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getReportsForReview({ page, limit: 10, status: statusFilter || undefined }),
      ]);
      setStats(dash);
      setReports(rev);
      // Load recent review logs too
      adminApi.getReviewLogs({ limit: 5 }).then((r) => setReviewLogs(r.items)).catch(() => {});
      setLastRefreshed(new Date());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh admin dashboard on real-time events
  useEffect(() => {
    const unsub1 = subscribe('dashboard_refresh', () => load());
    const unsub2 = subscribe('report_created',    () => load());
    const unsub3 = subscribe('notification',      () => load());
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe, load]);

  const handleStatusUpdate = async (id, verificationStatus, severity, comment) => {
    setActionId(id);
    try {
      await adminApi.updateReportStatus(id, { verificationStatus, severity, comment });
      setActionModal(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  if (loading && !stats) return <LoadingSpinner fullPage />;

  const t = stats?.totals || {};
  const summaryCards = [
    { label: 'Total Reports', value: t.total, icon: FileText, color: '#06b6d4' },
    { label: 'Pending', value: t.pending, icon: Clock, color: '#f59e0b' },
    { label: 'Verified', value: t.verified, icon: CheckCircle, color: '#22c55e' },
    { label: 'Rejected', value: t.rejected, icon: XCircle, color: '#ef4444' },
    { label: 'High Priority', value: t.highPriority, icon: AlertTriangle, color: '#8b5cf6' },
    { label: 'Total Users', value: t.totalUsers, icon: Users, color: '#3b82f6' },
  ];

  const categoryData = (stats?.byCategory || []).map((c) => ({
    name: CATEGORY_LABELS[c._id] || c._id,
    count: c.count,
  }));

  const statusData = (stats?.byVerification || []).map((s) => ({
    name: STATUS_LABELS[s._id] || s._id,
    value: s.count,
  }));

  const timeData = (stats?.overTime || []).map((d) => ({ date: d.date, count: d.count }));

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Shield size={24} color="var(--cyan-500)" /> Admin Dashboard</h1>
          <p>
            Review reports, monitor statistics, and manage verification.
            {lastRefreshed && (
              <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 8 }}>
                Auto-updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => load()} title="Refresh now">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {summaryCards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${c.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.icon size={20} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{c.value}</div>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }} data-charts>
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Reports over time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Reports by category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Verification status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report management */}
      <div className="card">
        <div className="flex items-center justify-between mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h3>Reports for Review</h3>
          <select className="form-select" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="info_requested">Info Requested</option>
          </select>
        </div>

        {reports.items.length === 0 ? (
          <div className="empty-state">
            <FileText size={36} />
            <p>No reports match this filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Category</th>
                  <th>Submitted by</th>
                  <th>Observed</th>
                  <th>Status</th>
                  <th>AI</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.items.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.title}</strong>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{r.reportId}</div>
                    </td>
                    <td>{CATEGORY_LABELS[r.category]}</td>
                    <td>{r.user?.name || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(r.observationDate)}</td>
                    <td><StatusBadge status={r.verificationStatus} /></td>
                    <td><AiStatusBadge status={r.aiStatus} /></td>
                    <td>{r.priority && r.priority !== 'low' ? <PriorityBadge priority={r.priority} /> : '—'}</td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setActionModal({ report: r, type: 'verified' })}>Verify</button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setActionModal({ report: r, type: 'rejected' })}>Reject</button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setActionModal({ report: r, type: 'info_requested' })}>Request Info</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reports.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-muted">Page {page} of {reports.pages}</span>
            <button className="btn btn-secondary" disabled={page === reports.pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Recent review activity */}
      {reviewLogs.length > 0 && (
        <div className="card mt-4">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Recent Review Activity</h3>
          <div className="flex-col gap-2">
            {reviewLogs.map((log) => (
              <div key={log._id} style={{ borderLeft: '3px solid var(--cyan-500)', paddingLeft: 12 }}>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {log.admin?.name || 'Admin'} • {formatDateTime(log.createdAt)}
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>{log.action}</strong> on {log.report?.title || 'report'}
                  {log.fromStatus && ` (${log.fromStatus} → ${log.toStatus})`}
                </div>
                {log.comment && <div className="text-muted" style={{ fontSize: '0.85rem' }}>“{log.comment}”</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <ActionModal
          action={actionModal}
          onClose={() => setActionModal(null)}
          onSubmit={(severity, comment) => handleStatusUpdate(actionModal.report._id, actionModal.type, severity, comment)}
          busy={actionId === actionModal.report._id}
        />
      )}

      <style>{`
        @media (max-width: 700px) {
          [data-charts] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ActionModal({ action, onClose, onSubmit, busy }) {
  const [comment, setComment] = useState('');
  const [severity, setSeverity] = useState('unassigned');
  const labels = { verified: 'Verify', rejected: 'Reject', info_requested: 'Request Info' };
  const colors = { verified: 'btn-primary', rejected: 'btn-danger', info_requested: 'btn-secondary' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8 }}>{labels[action.type]} Report</h3>
        <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: 12 }}>
          {action.report.title} ({action.report.reportId})
        </p>
        <div className="form-group">
          <label className="form-label">Severity (optional)</label>
          <select className="form-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="unassigned">Unassigned</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Comment</label>
          <textarea className="form-textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a review note..." rows={3} />
        </div>
        <div className="flex gap-2">
          <button className={`btn ${colors[action.type]}`} onClick={() => onSubmit(severity, comment)} disabled={busy}>
            {busy ? 'Saving...' : labels[action.type]}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
