import { Link } from 'react-router-dom';
import { MapPin, Calendar, ImageIcon } from 'lucide-react';
import StatusBadge, { AiStatusBadge, PriorityBadge } from './StatusBadge.jsx';
import { CATEGORY_LABELS, formatDate, truncate } from '../utils/format.js';

export default function ReportCard({ report }) {
  const image = report.images?.[0]?.url;
  const link = `/reports/${report._id}`;

  return (
    <Link to={link} className="card card-hover" style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          height: 150,
          borderRadius: 8,
          marginBottom: 12,
          background: image
            ? `url(${image}) center/cover`
            : 'linear-gradient(135deg, #0a2540, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: image ? 'transparent' : 'rgba(255,255,255,0.6)',
        }}
      >
        {!image && <ImageIcon size={36} />}
      </div>

      <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
        <StatusBadge status={report.verificationStatus} />
        <AiStatusBadge status={report.aiStatus} />
        {report.priority && report.priority !== 'low' && (
          <PriorityBadge priority={report.priority} />
        )}
      </div>

      <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{report.title}</h3>

      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
        <span className="badge badge-low">{CATEGORY_LABELS[report.category] || report.category}</span>
      </div>

      <p className="text-muted" style={{ fontSize: '0.88rem' }}>
        {truncate(report.description, 110)}
      </p>

      <div className="flex items-center justify-between mt-2 text-muted" style={{ fontSize: '0.82rem' }}>
        <span className="flex items-center gap-2">
          <MapPin size={14} />
          {report.latitude?.toFixed(3)}, {report.longitude?.toFixed(3)}
        </span>
        <span className="flex items-center gap-2">
          <Calendar size={14} />
          {formatDate(report.observationDate)}
        </span>
      </div>

      {report.reportId && (
        <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>{report.reportId}</div>
      )}
    </Link>
  );
}
