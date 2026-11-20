const statusLabels = {
  pending: 'Pending Verification',
  verified: 'Verified Partner',
  rejected: 'Rejected'
};

export default function PartnerVerificationBadge({ status }) {
  return (
    <span className={`partner-badge partner-badge-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}
