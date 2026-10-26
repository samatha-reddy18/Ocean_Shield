import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react';
import { reportApi } from '../services/reportService.js';
import { errorMessage } from '../services/api.js';
import { CATEGORY_LABELS, formatDate } from '../utils/format.js';
import ReportCard from '../components/ReportCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function MyReports() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await reportApi.getMyReports({ page, limit: 9, status: statusFilter });
        setData(result);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [page, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await reportApi.deleteReport(id);
      setData((d) => ({
        ...d,
        items: d.items.filter((r) => r._id !== id),
        total: d.total - 1,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>My Reports</h1>
          <p>Manage the hazard reports you've submitted.</p>
        </div>
        <Link to="/report-hazard" className="btn btn-primary">
          <Plus size={18} /> New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="info_requested">Info Requested</option>
        </select>
        <span className="text-muted">{data.total} report{data.total !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : data.items.length === 0 ? (
        <div className="card empty-state">
          <FileText size={40} />
          <h3>No reports yet</h3>
          <p>You haven't submitted any reports matching this filter.</p>
          <Link to="/report-hazard" className="btn btn-primary mt-4">
            <Plus size={18} /> Submit a report
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {data.items.map((r) => (
              <div key={r._id} style={{ position: 'relative' }}>
                <ReportCard report={r} />
                <div className="flex gap-2" style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                  {!['verified', 'rejected'].includes(r.verificationStatus) && (
                    <Link to={`/reports/${r._id}`} className="btn btn-secondary" style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.9)' }} title="Edit">
                      <Edit size={14} />
                    </Link>
                  )}
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.3rem' }}
                    onClick={() => handleDelete(r._id)}
                    disabled={deleting === r._id}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-muted">Page {page} of {data.pages}</span>
              <button className="btn btn-secondary" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
