import { ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export default function TextileCard({ textile }) {
  return (
    <Link className="textile-card" to={`/textiles/${textile._id}`}>
      <div className="textile-card-image">
        {textile.photos?.[0]
          ? <img src={`${apiOrigin}${textile.photos[0]}`} alt={textile.itemType} />
          : <ImageIcon size={23} aria-hidden="true" />}
      </div>
      <div className="textile-card-copy">
        <div className="textile-card-top"><StatusBadge status={textile.status} /><ArrowUpRight size={16} /></div>
        <h2>{textile.itemType}</h2>
        <p>{textile.material} <span>·</span> {textile.condition}</p>
        <div className="textile-card-meta">
          <span>{textile.quantity} {textile.quantityUnit}</span>
          <span>{textile.location.city}{textile.location.state ? `, ${textile.location.state}` : ''}</span>
        </div>
        <span className="textile-ref">{textile.refId}</span>
      </div>
    </Link>
  );
}