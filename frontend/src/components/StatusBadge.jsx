import { STATUS_LABELS, AI_STATUS_LABELS } from '../utils/format.js';

// Verification status badge
export function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}

// AI analysis status badge
export function AiStatusBadge({ status }) {
  const map = {
    pending: 'pending',
    processing: 'info_requested',
    completed: 'verified',
    unavailable: 'rejected',
    failed: 'rejected',
  };
  const label = AI_STATUS_LABELS[status] || status;
  return <span className={`badge badge-${map[status] || 'pending'}`}>AI: {label}</span>;
}

// Priority badge
export function PriorityBadge({ priority }) {
  if (!priority || priority === 'unassigned') return null;
  return <span className={`badge badge-${priority}`}>{priority} priority</span>;
}

export default StatusBadge;
