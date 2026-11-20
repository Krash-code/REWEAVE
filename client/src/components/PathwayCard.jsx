import ConfidenceBadge from './ConfidenceBadge.jsx';

/**
 * PathwayCard — one suggested circularity pathway with confidence and reason.
 *
 * Props:
 *   pathway    string   e.g. "reuse"
 *   confidence string   "high" | "medium" | "low"
 *   reason     string   plain-language explanation from the engine
 */

const pathwayLabels = {
  reuse:             'Reuse',
  donation:          'Donation',
  resale:            'Resale',
  repair:            'Repair',
  upcycling:         'Upcycling',
  recycling:         'Recycling',
  manual_assessment: 'Manual Assessment'
};

const pathwayIcons = {
  reuse:             '♻',
  donation:          '🤝',
  resale:            '🏷',
  repair:            '🪡',
  upcycling:         '✂',
  recycling:         '♻',
  manual_assessment: '🔍'
};

export default function PathwayCard({ pathway, confidence, reason }) {
  const label = pathwayLabels[pathway] || pathway.replaceAll('_', ' ');
  const icon  = pathwayIcons[pathway] || '●';

  return (
    <div className={`pathway-card pathway-${pathway}`}>
      <div className="pathway-card-top">
        <span className="pathway-icon" aria-hidden="true">{icon}</span>
        <span className="pathway-label">{label}</span>
        <ConfidenceBadge confidence={confidence} />
      </div>
      {reason && <p className="pathway-reason">{reason}</p>}
    </div>
  );
}
