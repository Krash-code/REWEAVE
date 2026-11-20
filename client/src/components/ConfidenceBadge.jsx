/**
 * ConfidenceBadge — displays high / medium / low with a colour-coded pill.
 */
const labelMap = {
  high:   'High confidence',
  medium: 'Medium confidence',
  low:    'Low confidence'
};

export default function ConfidenceBadge({ confidence }) {
  return (
    <span className={`confidence-badge confidence-${confidence}`}>
      {labelMap[confidence] || confidence}
    </span>
  );
}
