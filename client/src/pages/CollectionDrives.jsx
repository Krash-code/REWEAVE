import {
  ArrowRight,
  BarChart2,
  Calendar,
  Leaf,
  MapPin,
  Plus,
  RotateCcw,
  Scale,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function DriveStatusBadge({ status }) {
  return (
    <span className={`drive-status-badge drive-status-${status}`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  );
}

function DriveCard({ drive, onClick, isSelected }) {
  const now = new Date();
  const end = new Date(drive.endDate);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  return (
    <button
      type="button"
      className={`drive-card ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onClick(drive._id)}
    >
      <div className="drive-card-top">
        <strong>{drive.title}</strong>
        <DriveStatusBadge status={drive.status} />
      </div>
      <p className="drive-card-institution">{drive.institution?.name}</p>
      <div className="drive-card-meta">
        <span><MapPin size={11} /> {drive.location?.city}</span>
        <span>
          <Calendar size={11} />
          {new Date(drive.startDate).toLocaleDateString()} – {new Date(drive.endDate).toLocaleDateString()}
        </span>
        {drive.status === 'open' && daysLeft > 0 && (
          <span className="drive-days-left">{daysLeft}d left</span>
        )}
        {drive.targetWeightKg > 0 && (
          <span><Scale size={11} /> Target: {drive.targetWeightKg} kg</span>
        )}
        {drive.participants?.length > 0 && (
          <span><Users size={11} /> {drive.participants.length} participant{drive.participants.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </button>
  );
}

function ImpactSummary({ impact }) {
  const items = [
    { key: 'totalRegistered', label: 'Textiles', unit: '' },
    { key: 'totalCollectedKg', label: 'Collected', unit: 'kg' },
    { key: 'totalRecoveredKg', label: 'Recovered', unit: 'kg' },
    { key: 'awaitingOutcomeKg', label: 'Awaiting outcome', unit: 'kg' },
    { key: 'rejectedKg', label: 'Rejected', unit: 'kg' }
  ];

  return (
    <div className="metric-grid compact" style={{ marginTop: 18 }}>
      {items.map(({ key, label, unit }) => (
        <article key={key} className="metric-card">
          <span>{label}</span>
          <strong>{unit ? `${Number(impact[key] ?? 0).toFixed(1)} ${unit}` : (impact[key] ?? 0)}</strong>
        </article>
      ))}
    </div>
  );
}

function CreateDriveForm({ onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    city: '',
    state: '',
    venue: '',
    targetWeightKg: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/drives', {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        location: { city: form.city, state: form.state, venue: form.venue },
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : 0
      });
      setForm({ title: '', description: '', startDate: '', endDate: '', city: '', state: '', venue: '', targetWeightKg: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create drive.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="primary-link-button" style={{ textDecoration: 'none', cursor: 'pointer', marginBottom: 20, display: 'inline-flex' }} onClick={() => setOpen(true)}>
        <Plus size={15} /> Create collection drive
      </button>
    );
  }

  return (
    <form className="textile-form" style={{ marginBottom: 28 }} onSubmit={handleSubmit}>
      <div className="form-section-heading">
        <span>NEW DRIVE</span>
        <h2>Create a collection drive</h2>
      </div>
      {error && <div className="form-error">{error}</div>}
      <label className="form-label" style={{ marginTop: 16 }}>
        Title *
        <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={140} />
      </label>
      <label className="form-label" style={{ marginTop: 14 }}>
        Description
        <textarea className="form-control" rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="textile-form-grid" style={{ paddingTop: 16 }}>
        <label className="form-label">
          Start date *
          <input className="form-control" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        </label>
        <label className="form-label">
          End date *
          <input className="form-control" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
        </label>
        <label className="form-label">
          City *
          <input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
        </label>
        <label className="form-label">
          State
          <input className="form-control" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </label>
        <label className="form-label">
          Venue / location
          <input className="form-control" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </label>
        <label className="form-label">
          Target weight (kg)
          <input className="form-control" type="number" min="0" value={form.targetWeightKg} onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })} />
        </label>
      </div>
      <div className="form-actions">
        <button className="submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create drive'}
        </button>
        <button type="button" className="quiet-text-button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default function CollectionDrives() {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [myTextiles, setMyTextiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  async function loadDrives() {
    setLoadingDrives(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/drives', { params });
      setDrives(data.data.drives || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load collection drives.');
    } finally {
      setLoadingDrives(false);
    }
  }

  useEffect(() => {
    Promise.all([
      loadDrives(),
      user?.role !== 'partner' && user?.role !== 'admin'
        ? api.get('/textiles', { params: { limit: 50 } }).then((res) => setMyTextiles(res.data.data.textiles || []))
        : Promise.resolve()
    ]);
  }, [statusFilter]);

  async function openDrive(driveId) {
    setLoadingDetail(true);
    setSelected(null);
    setReport(null);
    try {
      const [detailRes, reportRes] = await Promise.all([
        api.get(`/drives/${driveId}`),
        api.get(`/drives/${driveId}/report`)
      ]);
      setSelected(detailRes.data.data);
      setReport(reportRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load drive details.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function joinDrive() {
    await api.post(`/drives/${selected.drive._id}/join`);
    await openDrive(selected.drive._id);
  }

  async function submitTextile(textileId) {
    if (!textileId) return;
    try {
      await api.post(`/drives/${selected.drive._id}/submit`, { textileId });
      await openDrive(selected.drive._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit textile.');
    }
  }

  return (
    <section className="page-shell">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">INSTITUTIONAL DRIVES</span>
          <h1>Collection drives</h1>
          <p>Community and college campaigns for bulk textile collection and recovery.</p>
        </div>
        <button type="button" className="btn-outline-sm" onClick={loadDrives}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {(user?.role === 'institution' || user?.role === 'admin') && (
        <CreateDriveForm onCreated={loadDrives} />
      )}

      {/* Status filter */}
      <div className="list-toolbar">
        <div className="list-count">{drives.length} drive{drives.length !== 1 ? 's' : ''}</div>
        <div className="filter-tabs">
          {['', 'open', 'closed'].map((value) => (
            <button
              key={value}
              type="button"
              className={`filter-tab ${statusFilter === value ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {value === '' ? 'All' : value === 'open' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {loadingDrives ? (
        <Loader label="Loading collection drives..." />
      ) : drives.length === 0 ? (
        <div className="textile-empty-state">
          <span className="empty-mark">—</span>
          <h2>No collection drives yet.</h2>
          <p>{user?.role === 'institution' || user?.role === 'admin' ? 'Create one above to get started.' : 'Check back when an institution launches a drive.'}</p>
        </div>
      ) : (
        <div className="drive-list">
          {drives.map((drive) => (
            <DriveCard
              key={drive._id}
              drive={drive}
              onClick={openDrive}
              isSelected={selected?.drive?._id === drive._id}
            />
          ))}
        </div>
      )}

      {/* Drive detail panel */}
      {loadingDetail && <Loader label="Loading drive details..." />}

      {selected && (
        <aside className="drive-detail">
          <div className="drive-detail-header">
            <div>
              <span className="eyebrow">DRIVE DETAIL</span>
              <h2>{selected.drive.title}</h2>
              <DriveStatusBadge status={selected.drive.status} />
            </div>
          </div>

          {selected.drive.description && <p className="drive-detail-desc">{selected.drive.description}</p>}

          <dl className="detail-facts" style={{ marginTop: 16, marginBottom: 0 }}>
            <div><dt>Institution</dt><dd>{selected.drive.institution?.name}</dd></div>
            <div><dt>Location</dt><dd><MapPin size={12} /> {[selected.drive.location?.venue, selected.drive.location?.city, selected.drive.location?.state].filter(Boolean).join(', ')}</dd></div>
            <div><dt>Dates</dt><dd><Calendar size={12} /> {new Date(selected.drive.startDate).toLocaleDateString()} – {new Date(selected.drive.endDate).toLocaleDateString()}</dd></div>
            <div><dt>Target</dt><dd>{selected.drive.targetWeightKg > 0 ? `${selected.drive.targetWeightKg} kg` : '—'}</dd></div>
            <div><dt>Participants</dt><dd><Users size={12} /> {selected.drive.participants?.length || 0}</dd></div>
            <div><dt>Textiles registered</dt><dd>{selected.textiles?.length || 0}</dd></div>
          </dl>

          {/* Actions */}
          {selected.drive.status === 'open' && !selected.joined && (
            <button className="recommend-button" style={{ marginTop: 18 }} onClick={joinDrive}>
              Join this drive <ArrowRight size={14} />
            </button>
          )}

          {selected.joined && selected.drive.status === 'open' && myTextiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label">
                Submit a textile to this drive
                <select className="form-select" defaultValue="" onChange={(e) => submitTextile(e.target.value)}>
                  <option value="">— choose a textile —</option>
                  {myTextiles.map((textile) => (
                    <option key={textile._id} value={textile._id}>
                      {textile.refId} · {textile.itemType} ({textile.status})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {selected.joined && (
            <p className="drive-joined-note">
              <span className="dot dot-green" /> You are a participant in this drive.
            </p>
          )}

          {/* Impact report */}
          {report && (
            <div style={{ marginTop: 20 }}>
              <div className="drive-report-header">
                <Leaf size={15} color="var(--green)" />
                <span className="eyebrow">IMPACT REPORT</span>
              </div>
              <ImpactSummary impact={report.impact} />
              {report.note && <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 10 }}>{report.note}</p>}
            </div>
          )}

          {/* Textiles list */}
          {selected.textiles?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <span className="eyebrow">REGISTERED TEXTILES</span>
              <ul className="drive-textile-list">
                {selected.textiles.map((textile) => (
                  <li key={textile._id} className="drive-textile-row">
                    <span className="drive-textile-ref">{textile.refId}</span>
                    <span>{textile.itemType}</span>
                    <StatusBadge status={textile.status} />
                    <span className="drive-textile-weight">{textile.estimatedWeightKg != null ? `${textile.estimatedWeightKg} kg` : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
