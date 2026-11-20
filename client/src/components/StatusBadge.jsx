const statusLabels = {
  registered: 'Registered',
  recommended: 'Recommended',
  requested: 'Requested',
  scheduled: 'Scheduled',
  collected: 'Collected',
  confirmed: 'Confirmed',
  awaiting_match: 'Awaiting match',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status] || status}</span>;
}