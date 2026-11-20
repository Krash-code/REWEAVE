import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  Package,
  RotateCcw,
  Truck,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const ALL_PATHWAYS = ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling'];
const ALL_MATERIALS = ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'];

function groupPickups(pickups) {
  return {
    requested: pickups.filter((p) => p.status === 'requested'),
    scheduled: pickups.filter((p) => p.status === 'scheduled'),
    collected: pickups.filter((p) => p.status === 'collected'),
    confirmed: pickups.filter((p) => p.status === 'confirmed'),
    rejected: pickups.filter((p) => p.status === 'rejected')
  };
}

function OrgSetupForm({ onDone }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    description: '',
    supportedPathways: ['recycling'],
    acceptedMaterials: ALL_MATERIALS,
    capacityKgPerMonth: 1000
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/partners', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        description: form.description,
        location: { city: form.city, state: form.state, address: form.address },
        supportedPathways: form.supportedPathways,
        acceptedMaterials: form.acceptedMaterials,
        capacityKgPerMonth: Number(form.capacityKgPerMonth)
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register partner organization.');
      setSubmitting(false);
    }
  }

  function togglePathway(pathway) {
    setForm((current) => ({
      ...current,
      supportedPathways: current.supportedPathways.includes(pathway)
        ? current.supportedPathways.filter((p) => p !== pathway)
        : [...current.supportedPathways, pathway]
    }));
  }

  function toggleMaterial(material) {
    setForm((current) => ({
      ...current,
      acceptedMaterials: current.acceptedMaterials.includes(material)
        ? current.acceptedMaterials.filter((m) => m !== material)
        : [...current.acceptedMaterials, material]
    }));
  }

  return (
    <section className="page-shell">
      <span className="eyebrow">PARTNER ONBOARDING</span>
      <h1>Register your organization</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
        Create a partner profile so incoming handover requests can be assigned to you.
        An admin must verify the profile before you appear in matching results.
      </p>
      {error && <div className="form-error">{error}</div>}
      <form className="textile-form" onSubmit={handleSubmit}>
        <div className="textile-form-grid">
          <label className="form-label">
            Organization name *
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
          </label>
          <label className="form-label">
            Contact email *
            <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="form-label">
            Phone
            <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
            Monthly capacity (kg)
            <input className="form-control" type="number" min="0" value={form.capacityKgPerMonth} onChange={(e) => setForm({ ...form, capacityKgPerMonth: e.target.value })} />
          </label>
        </div>
        <label className="form-label" style={{ marginTop: 16 }}>
          Description
          <textarea className="form-control" rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        <div className="onboarding-section">
          <span className="eyebrow">SUPPORTED PATHWAYS</span>
          <p className="onboarding-hint">Select all circular recovery pathways your organization supports</p>
          <div className="pathway-checkbox-group">
            {ALL_PATHWAYS.map((pathway) => (
              <label key={pathway} className={`checkbox-pill ${form.supportedPathways.includes(pathway) ? 'is-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.supportedPathways.includes(pathway)}
                  onChange={() => togglePathway(pathway)}
                />
                {pathway}
              </label>
            ))}
          </div>
        </div>

        <div className="onboarding-section">
          <span className="eyebrow">ACCEPTED MATERIALS</span>
          <p className="onboarding-hint">Select all material types your organization can process</p>
          <div className="pathway-checkbox-group">
            {ALL_MATERIALS.map((material) => (
              <label key={material} className={`checkbox-pill ${form.acceptedMaterials.includes(material) ? 'is-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.acceptedMaterials.includes(material)}
                  onChange={() => toggleMaterial(material)}
                />
                {material}
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="submit-button" type="submit" disabled={submitting || form.supportedPathways.length === 0}>
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </button>
          <span>An admin will review and approve your profile before it appears in matching results.</span>
        </div>
      </form>
    </section>
  );
}

function PickupCard({ pickup }) {
  const textile = pickup.textile || {};
  const isScheduled = pickup.status === 'scheduled';

  return (
    <Link className="pickup-card" to={`/pickups/${pickup._id}`}>
      <div className="pickup-card-top">
        <strong>{textile.refId || 'Textile'}</strong>
        <StatusBadge status={pickup.status} />
      </div>
      <p className="pickup-card-type">{textile.itemType || '—'}</p>
      <p>
        {textile.material} · {pickup.pathway}
      </p>
      <p>
        {pickup.transferType === 'drop_off' ? 'Drop-off' : 'Pickup'}
        {isScheduled && pickup.scheduledDate && (
          <span className="pickup-card-date"> · {new Date(pickup.scheduledDate).toLocaleDateString()}</span>
        )}
      </p>
      <div className="pickup-card-meta">
        <span><Package size={11} /> {textile.estimatedWeightKg ?? '—'} kg est.</span>
        {textile.condition && <span className="capitalize">{textile.condition}</span>}
      </div>
    </Link>
  );
}

export default function PartnerDashboard() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsOrg, setNeedsOrg] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [pickupRes, partnerRes] = await Promise.allSettled([
        api.get('/pickups/partner'),
        api.get('/partners?verificationStatus=pending')
      ]);
      if (pickupRes.status === 'fulfilled') {
        setPickups(pickupRes.value.data.data.pickups || []);
        setNeedsOrg(false);
      } else {
        const status = pickupRes.reason?.response?.status;
        if (status === 403) setNeedsOrg(true);
        else setError(pickupRes.reason?.response?.data?.message || 'Could not load partner requests.');
      }
      if (partnerRes.status === 'fulfilled') {
        // Try to get own partner profile to show pending state
        const partners = partnerRes.value?.data?.data?.partners || [];
        if (partners.length) setPartnerInfo(partners[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => groupPickups(pickups), [pickups]);

  if (loading) return <section className="page-shell"><Loader label="Loading partner workspace..." /></section>;

  if (needsOrg) return <OrgSetupForm onDone={load} />;

  // Show pending verification state
  if (pickups.length === 0 && partnerInfo?.verificationStatus === 'pending') {
    return (
      <section className="page-shell">
        <span className="eyebrow">PARTNER WORKSPACE</span>
        <h1>Pending verification</h1>
        <div className="awaiting-match-banner" style={{ marginTop: 24 }}>
          <div className="awaiting-icon"><AlertCircle size={24} /></div>
          <div className="awaiting-content">
            <span className="eyebrow">UNDER REVIEW</span>
            <h3>Your organization is awaiting admin approval</h3>
            <p>
              <strong>{partnerInfo.name}</strong> has been submitted for verification.
              Once an admin approves your profile, you will appear in textile matching results and
              incoming handover requests will be assigned here.
            </p>
          </div>
        </div>
        <button type="button" className="btn-outline-sm" style={{ marginTop: 20 }} onClick={load}>
          <RotateCcw size={14} /> Check status
        </button>
      </section>
    );
  }

  const columns = [
    { key: 'requested', title: 'Incoming requests', icon: Inbox, color: 'var(--green)' },
    { key: 'scheduled', title: 'Scheduled', icon: Truck, color: '#456276' },
    { key: 'collected', title: 'Awaiting inspection', icon: ClipboardCheck, color: '#8a6527' },
    { key: 'confirmed', title: 'Confirmed', icon: CheckCircle2, color: '#2a6137' },
    { key: 'rejected', title: 'Rejected', icon: XCircle, color: '#8e4c39' }
  ];

  const totalActive = groups.requested.length + groups.scheduled.length + groups.collected.length;

  return (
    <section className="page-shell">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">PARTNER WORKSPACE</span>
          <h1>Incoming handovers</h1>
          <p>Only requests assigned to your organization are shown.</p>
        </div>
        <button type="button" className="btn-outline-sm" onClick={load}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Summary strip */}
      <div className="partner-summary-strip">
        <span><strong>{totalActive}</strong> active</span>
        <span><strong>{groups.confirmed.length}</strong> confirmed</span>
        <span><strong>{groups.rejected.length}</strong> rejected</span>
        <span><strong>{pickups.length}</strong> total</span>
      </div>

      <div className="partner-board">
        {columns.map((column) => (
          <div key={column.key} className="partner-column">
            <div className="partner-column-head" style={{ color: column.color }}>
              <column.icon size={14} />
              <h2>{column.title}</h2>
              <span className="column-count">{groups[column.key].length}</span>
            </div>
            {groups[column.key].length === 0 ? (
              <p className="column-empty">None</p>
            ) : (
              groups[column.key].map((pickup) => <PickupCard key={pickup._id} pickup={pickup} />)
            )}
          </div>
        ))}
      </div>

      {pickups.length === 0 && (
        <div className="textile-empty-state" style={{ marginTop: 0 }}>
          <span className="empty-mark">—</span>
          <h2>No handover requests yet.</h2>
          <p>
            Once your organization is verified and textiles are matched to your profile,
            incoming requests will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
