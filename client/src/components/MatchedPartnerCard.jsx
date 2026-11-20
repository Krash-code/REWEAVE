import { CheckCircle2, MapPin, Scale } from 'lucide-react';

export default function MatchedPartnerCard({ partner, pathway, onSelect, isSubmitting }) {
  return (
    <div className={`matched-partner-card ${partner.isLocal ? 'is-local' : ''}`}>
      <div className="matched-partner-header">
        <div>
          <div className="partner-title-row">
            <h4>{partner.name}</h4>
            {partner.isLocal && <span className="local-pill">Local in your city</span>}
          </div>
          <p className="partner-location">
            <MapPin size={12} /> {partner.location?.city}
            {partner.location?.state ? `, ${partner.location.state}` : ''}
          </p>
        </div>
      </div>

      {partner.description && (
        <p className="partner-desc">{partner.description}</p>
      )}

      <div className="partner-meta-row">
        {partner.availableCapacityKg != null && (
          <span className="partner-capacity">
            <Scale size={12} /> {partner.availableCapacityKg.toLocaleString()} kg available capacity
          </span>
        )}
      </div>

      <button
        type="button"
        className="partner-select-button"
        onClick={() => onSelect(pathway, partner._id)}
        disabled={isSubmitting}
      >
        <CheckCircle2 size={14} />
        {isSubmitting ? 'Requesting…' : `Request Handover (${pathway})`}
      </button>
    </div>
  );
}
