import { ArrowLeft, ArrowRight, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import TextileCard from '../components/TextileCard.jsx';
import { TEXTILE_STATUSES } from '../utils/constants.js';

const statusLabels = {
  registered: 'Registered',
  recommended: 'Recommended',
  requested: 'Requested',
  collected: 'Collected',
  confirmed: 'Confirmed',
  awaiting_match: 'Awaiting match',
  rejected: 'Rejected'
};

export default function UserDashboard() {
  const [textiles, setTextiles] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { page, limit: 12 };
    if (status) params.status = status;

    api.get('/textiles', { params })
      .then(({ data }) => {
        if (!active) return;
        setTextiles(data.data.textiles);
        setPagination(data.data.pagination);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load textiles.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [page, status, reloadKey]);

  function changeStatus(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  return (
    <section className="page-shell dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR MATERIALS / {String(pagination.total).padStart(2, '0')}</span>
          <h1>My textiles</h1>
          <p>Every textile gets its own record and next-step history.</p>
        </div>
        <Link className="primary-link-button" to="/textiles/new"><Plus size={17} /> Register textile</Link>
      </div>

      <div className="list-toolbar">
        <div className="list-count">{pagination.total} {pagination.total === 1 ? 'record' : 'records'}</div>
        <label className="filter-control" htmlFor="statusFilter">
          <span>Filter status</span>
          <select id="statusFilter" className="form-select" value={status} onChange={changeStatus}>
            <option value="">All statuses</option>
            {TEXTILE_STATUSES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
          </select>
        </label>
      </div>

      {loading ? <Loader label="Loading your textiles..." /> : error ? (
        <div className="load-error" role="alert"><p>{error}</p><button type="button" onClick={() => setReloadKey((current) => current + 1)}><RotateCcw size={15} /> Retry</button></div>
      ) : textiles.length ? (
        <>
          <div className="textile-list-grid">{textiles.map((textile) => <TextileCard key={textile._id} textile={textile} />)}</div>
          {pagination.pages > 1 && (
            <div className="pagination-row">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={15} /> Previous</button>
              <span>Page {page} of {pagination.pages}</span>
              <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next <ArrowRight size={15} /></button>
            </div>
          )}
        </>
      ) : (
        <div className="textile-empty-state">
          <span className="empty-mark">01</span>
          <h2>{status ? 'No textiles in this status.' : 'A new journey starts here.'}</h2>
          <p>{status ? 'Try another status filter to see your records.' : 'Register an unwanted textile and keep its next steps in one place.'}</p>
          {!status && <Link to="/textiles/new" className="text-link">Register your first textile <ArrowRight size={15} /></Link>}
        </div>
      )}
    </section>
  );
}