import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';

const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export default function PublicPassport() {
  const { refId } = useParams();
  const [passport, setPassport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/passports/${refId}`)
      .then(({ data }) => setPassport(data.data.passport))
      .catch((err) => setError(err.response?.data?.message || 'Passport not found.'))
      .finally(() => setLoading(false));
  }, [refId]);

  if (loading) return <section className="page-shell"><Loader label="Opening textile passport..." /></section>;
  if (error) return <section className="page-shell"><div className="form-error">{error}</div></section>;

  return (
    <section className="page-shell detail-page">
      <span className="eyebrow">DIGITAL TEXTILE PASSPORT</span>
      <div className="detail-heading">
        <div>
          <h1>{passport.itemType}</h1>
          <StatusBadge status={passport.status} />
        </div>
        <img className="qr-image" src={`${apiOrigin}/api/passports/${passport.refId}/qr`} alt={`QR code for ${passport.refId}`} />
      </div>
      <p className="textile-ref">{passport.refId}</p>
      <dl className="detail-facts">
        <div><dt>Material</dt><dd>{passport.material}</dd></div>
        <div><dt>Condition</dt><dd>{passport.condition}</dd></div>
        <div><dt>Location</dt><dd>{passport.location?.city}</dd></div>
        <div><dt>Selected pathway</dt><dd>{passport.selectedPathway || '—'}</dd></div>
        <div><dt>Partner</dt><dd>{passport.partner?.name || '—'}</dd></div>
        <div><dt>Recovery weight</dt><dd>{passport.collection?.actualWeightKg ?? passport.estimatedWeightKg ?? '—'} kg</dd></div>
      </dl>
      <section className="history-section">
        <h2>Lifecycle history</h2>
        <Timeline events={passport.history || []} />
      </section>
    </section>
  );
}
