import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { MapPin, Calendar, User, Bot, Tag, Copy, AlertTriangle, Sparkles, FileText, Trash2, Edit } from 'lucide-react';
import MapView from '../components/MapView.jsx';
import StatusBadge, { AiStatusBadge, PriorityBadge } from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { reportApi } from '../services/reportService.js';
import { aiApi } from '../services/aiService.js';
import { errorMessage } from '../services/api.js';
import { CATEGORY_LABELS, STATUS_LABELS, formatDateTime, confidencePct } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ReportDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const justCreated = location.state?.justCreated;
  const createdReportId = location.state?.reportId;

  useEffect(() => {
    (async () => {
      try {
        const data = await reportApi.getReportById(id);
        setReport(data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const runAiAnalysis = async () => {
    setAiBusy(true);
    try {
      const result = await aiApi.analyzeReportImage(report._id);
      setReport((r) => ({ ...r, aiStatus: result.aiStatus, aiPrediction: result.prediction }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAiBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await reportApi.deleteReport(report._id);
      window.location.href = '/my-reports';
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error && !report) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <div className="alert alert-error">{error}</div>
        <Link to="/my-reports" className="btn btn-secondary mt-4">Back to My Reports</Link>
      </div>
    );
  }
  if (!report) return null;

  const isOwner = user && String(report.user?._id || report.user) === String(user._id);
  const canEdit = isOwner && !['verified', 'rejected'].includes(report.verificationStatus);

  return (
    <div className="container" style={{ maxWidth: 980, paddingBottom: '2rem' }}>
      {justCreated && (
        <div className="alert alert-success">
          <Sparkles size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Report submitted successfully! ID: <strong>{createdReportId || report.reportId}</strong>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <StatusBadge status={report.verificationStatus} />
          <AiStatusBadge status={report.aiStatus} />
          {report.priority && report.priority !== 'low' && <PriorityBadge priority={report.priority} />}
        </div>
        <div className="text-muted" style={{ fontSize: '0.85rem' }}>{report.reportId}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1.5rem' }} data-grid>
        {/* Left column */}
        <div className="flex-col gap-4">
          <h1>{report.title}</h1>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-low">{CATEGORY_LABELS[report.category]}</span>
            <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.88rem' }}>
              <User size={14} /> {report.user?.name || 'Anonymous'}
            </span>
            <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.88rem' }}>
              <Calendar size={14} /> Observed {formatDateTime(report.observationDate)}
            </span>
            <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.88rem' }}>
              <MapPin size={14} /> {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
            </span>
          </div>

          {/* Images */}
          {report.images?.length > 0 ? (
            <div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
                <img
                  src={report.images[activeImage]?.url}
                  alt="evidence"
                  style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }}
                />
              </div>
              {report.images.length > 1 && (
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {report.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={`thumbnail ${i}`}
                      onClick={() => setActiveImage(i)}
                      style={{
                        width: 64, height: 64, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                        border: i === activeImage ? '2px solid var(--cyan-500)' : '1px solid var(--border)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center text-muted">
              <FileText size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              No photographs attached.
            </div>
          )}

          {/* Description */}
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
          </div>

          {/* AI analysis */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2"><Bot size={18} color="var(--cyan-500)" /> AI Image Analysis</h3>
              <AiStatusBadge status={report.aiStatus} />
            </div>
            {report.aiStatus === 'completed' && report.aiPrediction ? (
              <div>
                <div className="flex items-center gap-3 mb-2" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-low" style={{ fontSize: '0.95rem', padding: '0.3rem 0.8rem' }}>
                    <Tag size={14} /> {CATEGORY_LABELS[report.aiPrediction.category] || report.aiPrediction.category}
                  </span>
                  <span className="badge badge-verified">Confidence {confidencePct(report.aiPrediction.confidence)}</span>
                </div>
                {report.aiPrediction.modelVersion && (
                  <div className="text-muted" style={{ fontSize: '0.82rem' }}>Model: {report.aiPrediction.modelVersion}</div>
                )}
                {report.aiPrediction.analyzedAt && (
                  <div className="text-muted" style={{ fontSize: '0.82rem' }}>Analyzed {formatDateTime(report.aiPrediction.analyzedAt)}</div>
                )}
              </div>
            ) : (
              <div className="text-muted">
                <p>
                  {report.aiStatus === 'pending' && 'Analysis is pending. Run it now to classify this image.'}
                  {report.aiStatus === 'processing' && 'Analysis in progress...'}
                  {report.aiStatus === 'unavailable' && 'AI analysis is currently unavailable.'}
                  {report.aiStatus === 'failed' && 'AI analysis failed. You can retry below.'}
                </p>
                {report.images?.length > 0 && (report.aiStatus === 'pending' || report.aiStatus === 'failed') && (
                  <button className="btn btn-secondary mt-2" onClick={runAiAnalysis} disabled={aiBusy}>
                    <Bot size={16} /> {aiBusy ? 'Analyzing...' : 'Run AI Analysis'}
                  </button>
                )}
              </div>
            )}
            <div className="alert alert-info mt-3" style={{ fontSize: '0.82rem', padding: '0.6rem 0.85rem' }}>
              <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              AI output is an automated assessment, not a confirmed environmental finding.
            </div>
          </div>

          {/* NLP analysis */}
          {report.nlpAnalysis?.keywords?.length > 0 && (
            <div className="card">
              <h3 className="flex items-center gap-2 mb-3"><Sparkles size={18} color="var(--teal-500)" /> NLP Extraction</h3>
              <div className="mb-3">
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>Keywords</div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {report.nlpAnalysis.keywords.map((k) => (
                    <span key={k} className="badge badge-low">{k}</span>
                  ))}
                </div>
              </div>
              {report.nlpAnalysis.locationReferences?.length > 0 && (
                <div className="mb-3">
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>Location references</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {report.nlpAnalysis.locationReferences.map((l) => (
                      <span key={l} className="badge badge-info_requested">{l}</span>
                    ))}
                  </div>
                </div>
              )}
              {report.nlpAnalysis.summary && (
                <div className="mb-3">
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>Summary</div>
                  <p style={{ fontSize: '0.92rem' }}>{report.nlpAnalysis.summary}</p>
                </div>
              )}
              {report.nlpAnalysis.missingInfo?.length > 0 && (
                <div>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>Potentially missing information</div>
                  <ul style={{ paddingLeft: 20, fontSize: '0.9rem' }}>
                    {report.nlpAnalysis.missingInfo.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex-col gap-4">
          {/* Map */}
          <div className="card">
            <h3 className="mb-2">Location</h3>
            <MapView reports={[report]} zoom={10} height={220} center={[report.latitude, report.longitude]} />
            <div className="flex items-center gap-2 mt-3 text-muted" style={{ fontSize: '0.85rem' }}>
              <MapPin size={14} /> {report.latitude?.toFixed(6)}, {report.longitude?.toFixed(6)}
            </div>
          </div>

          {/* Possible duplicates */}
          {report.possibleDuplicates?.length > 0 && (
            <div className="card">
              <h3 className="flex items-center gap-2 mb-3"><Copy size={18} color="var(--amber-500)" /> Possible Duplicates</h3>
              <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                Flagged for review — not automatically deleted.
              </p>
              <div className="flex-col gap-2">
                {report.possibleDuplicates.map((d, i) => (
                  <Link
                    key={i}
                    to={`/reports/${d.reportId?._id || d.reportId}`}
                    className="flex items-center justify-between"
                    style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none' }}
                  >
                    <span style={{ color: 'var(--navy-900)', fontSize: '0.88rem' }}>
                      {d.reportId?.title || 'Related report'}
                    </span>
                    <span className="badge badge-medium">score {d.score?.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Admin review comments (visible to owner) */}
          {report.reviewComments?.length > 0 && (
            <div className="card">
              <h3 className="mb-3">Review Notes</h3>
              <div className="flex-col gap-3">
                {report.reviewComments.map((c, i) => (
                  <div key={i} style={{ borderLeft: '3px solid var(--cyan-500)', paddingLeft: 12 }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {c.admin?.name || 'Admin'} • {formatDateTime(c.createdAt)}
                    </div>
                    <p style={{ fontSize: '0.9rem' }}>{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="card">
              <h3 className="mb-3">Actions</h3>
              <div className="flex-col gap-2">
                {canEdit && (
                  <Link to={`/report-hazard`} className="btn btn-secondary">
                    <Edit size={16} /> (Edit via the form — full edit coming soon)
                  </Link>
                )}
                <button className="btn btn-danger" onClick={handleDelete}>
                  <Trash2 size={16} /> Delete Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          [data-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
