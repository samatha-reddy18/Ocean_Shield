// Shared formatting helpers for the frontend.

// Human-readable category labels
export const CATEGORY_LABELS = {
  oil_spill: 'Oil Spill',
  plastic_pollution: 'Plastic Pollution',
  marine_debris: 'Marine Debris',
  coastal_pollution: 'Coastal Pollution',
  algal_bloom: 'Algal Bloom',
  dead_marine_animals: 'Dead Marine Animals',
  other: 'Other Marine Hazard',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  info_requested: 'Info Requested',
};

export const AI_STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  unavailable: 'Unavailable',
  failed: 'Failed',
};

// Category -> color (used by map markers)
export const CATEGORY_COLORS = {
  oil_spill: '#1f2937',
  plastic_pollution: '#3b82f6',
  marine_debris: '#f59e0b',
  coastal_pollution: '#8b5cf6',
  algal_bloom: '#22c55e',
  dead_marine_animals: '#ef4444',
  other: '#64748b',
};

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function truncate(text, max = 120) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// Convert a confidence (0-1) to a percentage string
export function confidencePct(c) {
  if (!c && c !== 0) return '—';
  return `${Math.round(c * 100)}%`;
}
