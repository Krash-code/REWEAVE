import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PATHWAYS = ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling'];
const CONDITIONS = ['good', 'repairable', 'damaged', 'unknown'];
const MATERIALS = ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'];

function InfoRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="pickup-info-row">
      {Icon && <Icon size={13} className="pickup-info-icon" />}
      <span className="pickup-info-label">{label}</span>
      <span className="pickup-info-value">{value}</span>
    </div>
  );
}

function ScheduleForm({ pickup, onSave, busy }) {
  const [form, setForm] = useState({
    scheduledDate: pickup.scheduledDate ? new Date(pickup.scheduledDate).toISOString().slice(0, 10) : '',
    timeSlot: pickup.timeSlot || '10:00–12:00',
    transferType: pickup.transferType || 'pickup',
    street: pickup.pickupAddress?.street || '',
    city: pickup.pickupAddress?.city || pickup.textile?.location?.city || '',
    state: pickup.pickupAddress?.state || pickup.textile?.location?.state || '',
    notes: pickup.notes || ''
  });

  return (
    <form className="textile-form" onSubmit={(event) => {
      event.preventDefault();
      onSave({
        scheduledDate: form.scheduledDate,
        timeSlot: form.timeSlot,
        transferType: form.transferType,
        pickupAddress: { street: form.street, city: form.city, state: form.state },
        notes: form.notes
      });
    }}>
      <span className="eyebrow">COLLECTION SCHEDULE</span>
      <div className="textile-form-grid">
        <label className="form-label">
          Transfer type
          <select className="form-select" value={form.transferType} onChange={(e) => setForm({ ...form, transferType: e.target.value })}>
            <option value="pickup">Pickup — partner collects from you</option>
            <option value="drop_off">Drop-off — you deliver to partner</option>
          </select>
        </label>
        <label className="form-label">
          Preferred date *
          <input
            className="form-control"
            type="date"
            required
            value={form.scheduledDate}
            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
          />
        </label>
        <label className="form-label">
          Time slot
          <input
            className="form-control"
            placeholder="e.g. 10:00–12:00"
            value={form.timeSlot}
            onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
          />
        </label>
        <label className="form-label">
          City
          <input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
        <label className="form-label" style={{ gridColumn: '1 / -1' }}>
          {form.transferType === 'drop_off' ? 'Drop-off address' : 'Pickup address'}
          <input className="form-control" value={form.street} placeholder="Street address or landmark" onChange={(e) => setForm({ ...form, street: e.target.value })} />
        </label>
      </div>
      <label className="form-label" style={{ marginTop: 14 }}>
        Logistics instructions
        <input className="form-control" value={form.notes} placeholder="Any special instructions for the partner" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      <div className="form-actions">
        <button className="submit-button" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </form>
  );
}

function ConfirmOutcomeForm({ pickup, onSave, busy }) {
  const [form, setForm] = useState({
    actualWeightKg: pickup.inspection?.actualWeightKg || '',
    verifiedMaterial: pickup.inspection?.verifiedMaterial || pickup.textile?.material || '',
    actualCondition: pickup.inspection?.actualCondition || pickup.textile?.condition || '',
    finalPathway: pickup.inspection?.finalPathway || pickup.pathway || 'reuse',
    processingNotes: pickup.inspection?.processingNotes || ''
  });

  return (
    <form className="textile-form confirm-form" onSubmit={(event) => {
      event.preventDefault();
      onSave({
        actualWeightKg: Number(form.actualWeightKg),
        verifiedMaterial: form.verifiedMaterial,
        actualCondition: form.actualCondition,
        finalPathway: form.finalPathway,
        processingNotes: form.processingNotes
      });
    }}>
      <div className="inspect-form-header">
        <CheckCircle2 size={18} color="var(--green)" />
        <span className="eyebrow">CONFIRM OUTCOME</span>
      </div>
      <label className="form-label">
        Actual received weight (kg) *
        <input
          className="form-control"
          type="number"
          min="0"
          step="0.01"
          required
          value={form.actualWeightKg}
          onChange={(e) => setForm({ ...form, actualWeightKg: e.target.value })}
        />
      </label>
      <div className="textile-form-grid" style={{ paddingTop: 14 }}>
        <label className="form-label">
          Verified material
          <select className="form-select" value={form.verifiedMaterial} onChange={(e) => setForm({ ...form, verifiedMaterial: e.target.value })}>
            <option value="">— not specified —</option>
            {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="form-label">
          Actual condition
          <select className="form-select" value={form.actualCondition} onChange={(e) => setForm({ ...form, actualCondition: e.target.value })}>
            <option value="">— not specified —</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="form-label" style={{ gridColumn: '1 / -1' }}>
          Final circular pathway *
          <select className="form-select" value={form.finalPathway} onChange={(e) => setForm({ ...form, finalPathway: e.target.value })} required>
            {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className="form-label" style={{ marginTop: 14 }}>
        Processing notes
        <textarea className="form-control" rows={3} value={form.processingNotes} onChange={(e) => setForm({ ...form, processingNotes: e.target.value })} />
      </label>
      <div className="form-actions">
        <button className="submit-button confirm-btn" disabled={busy} type="submit">
          <CheckCircle2 size={14} /> {busy ? 'Saving…' : 'Confirm outcome'}
        </button>
      </div>
    </form>
  );
}

function RejectForm({ onSave, busy }) {
  const [form, setForm] = useState({
    rejectionReason: '',
    rejectionKind: 'handover',
    processingNotes: ''
  });

  return (
    <form className="textile-form reject-form" onSubmit={(event) => {
      event.preventDefault();
      onSave(form);
    }}>
      <div className="inspect-form-header">
        <XCircle size={18} color="#bd6047" />
        <span className="eyebrow">RECORD REJECTION</span>
      </div>
      <label className="form-label">
        Rejection type *
        <select className="form-select" value={form.rejectionKind} onChange={(e) => setForm({ ...form, rejectionKind: e.target.value })}>
          <option value="handover">Rejected handover — material refused at receipt</option>
          <option value="processing_unsuccessful">Processing unsuccessful — failed during processing</option>
        </select>
      </label>
      <label className="form-label" style={{ marginTop: 14 }}>
        Reason * <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(e.g. contamination, material mismatch)</span>
        <textarea
          className="form-control"
          rows={4}
          required
          value={form.rejectionReason}
          onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })}
        />
      </label>
      <label className="form-label" style={{ marginTop: 14 }}>
        Processing notes (optional)
        <textarea className="form-control" rows={2} value={form.processingNotes} onChange={(e) => setForm({ ...form, processingNotes: e.target.value })} />
      </label>
      <div className="form-actions">
        <button className="submit-button reject-btn" disabled={busy} type="submit">
          <XCircle size={14} /> {busy ? 'Saving…' : 'Record rejection'}
        </button>
      </div>
    </form>
  );
}

export default function PickupDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadHistory(textileId) {
    if (!textileId) {
      setHistory([]);
      return;
    }

    const { data } = await api.get(`/textiles/${textileId}/history`);
    setHistory(data.data.events || []);
  }

  async function load() {
    const { data } = await api.get(`/pickups/${id}`);
    const currentPickup = data.data.pickup;
    setPickup(currentPickup);
    await loadHistory(currentPickup?.textile?._id);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.message || 'Could not load pickup.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function act(path, body = {}) {
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/pickups/${id}/${path}`, body);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="page-shell"><Loader label="Loading pickup request..." /></section>;
  if (!pickup) return (
    <section className="page-shell">
      <Link className="back-link" to="/partner"><ArrowLeft size={15} /> Back</Link>
      <div className="form-error" role="alert">{error || 'Pickup not found.'}</div>
    </section>
  );

  const isPartner = user?.role === 'partner' || user?.role === 'admin';
  const isOwner = !isPartner || user?.role === 'admin';
  const textile = pickup.textile || {};
  const partner = pickup.partner || {};
  const canSchedule = ['requested', 'scheduled'].includes(pickup.status);
  const canCollect = isPartner && pickup.status === 'scheduled';
  const canInspect = isPartner && pickup.status === 'collected';
  const canCancel = ['requested', 'scheduled'].includes(pickup.status);

  return (
    <section className="page-shell detail-page">
      <Link className="back-link" to={isPartner && user?.role !== 'admin' ? '/partner' : '/textiles'}>
        <ArrowLeft size={15} /> {isPartner && user?.role !== 'admin' ? 'Partner desk' : 'My textiles'}
      </Link>

      <div className="detail-heading">
        <div>
          <span className="eyebrow">PICKUP REQUEST / {textile.refId || id}</span>
          <h1>{textile.itemType || 'Handover request'}</h1>
          <div className="detail-badges">
            <StatusBadge status={pickup.status} />
            {textile.status && textile.status !== pickup.status && (
              <StatusBadge status={textile.status} />
            )}
          </div>
        </div>
        {textile._id && (
          <Link className="text-link" to={`/textiles/${textile._id}`}>
            View textile record
          </Link>
        )}
      </div>

      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      {/* Info grid */}
      <div className="pickup-info-grid">
        <div className="pickup-info-card">
          <span className="eyebrow">TEXTILE</span>
          <InfoRow icon={Package} label="Type" value={textile.itemType} />
          <InfoRow icon={Scale} label="Material" value={textile.material} />
          <InfoRow icon={null} label="Condition" value={textile.condition} />
          <InfoRow icon={Scale} label="Est. weight" value={textile.estimatedWeightKg != null ? `${textile.estimatedWeightKg} kg` : null} />
          <InfoRow icon={null} label="Pathway" value={pickup.pathway} />
        </div>
        <div className="pickup-info-card">
          <span className="eyebrow">PARTNER</span>
          <InfoRow icon={User} label="Name" value={partner.name} />
          <InfoRow icon={MapPin} label="Location" value={[partner.location?.city, partner.location?.state].filter(Boolean).join(', ')} />
          <InfoRow icon={null} label="Email" value={partner.email} />
          <InfoRow icon={null} label="Phone" value={partner.phone} />
        </div>
        <div className="pickup-info-card">
          <span className="eyebrow">SCHEDULE</span>
          <InfoRow icon={Calendar} label="Date" value={pickup.scheduledDate ? new Date(pickup.scheduledDate).toLocaleDateString() : 'Not yet set'} />
          <InfoRow icon={Clock} label="Time slot" value={pickup.timeSlot || 'Flexible'} />
          <InfoRow icon={null} label="Transfer" value={pickup.transferType === 'drop_off' ? 'Self drop-off' : 'Pickup'} />
          <InfoRow icon={MapPin} label="Address" value={[pickup.pickupAddress?.street, pickup.pickupAddress?.city].filter(Boolean).join(', ')} />
          {pickup.notes && <InfoRow icon={null} label="Notes" value={pickup.notes} />}
        </div>
      </div>

      {/* Owner: schedule form */}
      {canSchedule && !isPartner && (
        <div style={{ marginTop: 28 }}>
          <ScheduleForm pickup={pickup} onSave={(body) => act('schedule', body)} busy={busy} />
        </div>
      )}

      {/* Partner or owner: update schedule for scheduled pickup */}
      {canSchedule && isPartner && (
        <div style={{ marginTop: 28 }}>
          <ScheduleForm pickup={pickup} onSave={(body) => act('schedule', body)} busy={busy} />
        </div>
      )}

      {/* Partner: confirm collection */}
      {canCollect && (
        <div className="partner-action-card">
          <div className="partner-action-info">
            <ClipboardCheck size={22} color="var(--green)" />
            <div>
              <strong>Confirm physical collection</strong>
              <p>Click below once the textile has been physically collected from the owner.</p>
            </div>
          </div>
          <button
            className="submit-button"
            style={{ width: 'auto', minWidth: 200, marginTop: 0 }}
            disabled={busy}
            onClick={() => act('collect')}
          >
            <CheckCircle2 size={15} /> {busy ? 'Confirming…' : 'Confirm collection'}
          </button>
        </div>
      )}

      {/* Partner: inspect and confirm/reject outcome */}
      {canInspect && (
        <div>
          <div className="inspection-notice">
            <ClipboardCheck size={18} />
            <p>This textile is in your possession. Inspect it and record the final outcome below.</p>
          </div>
          <div className="inspect-grid">
            <ConfirmOutcomeForm pickup={pickup} onSave={(body) => act('confirm', body)} busy={busy} />
            <RejectForm onSave={(body) => act('reject', body)} busy={busy} />
          </div>
        </div>
      )}

      {/* Cancel button */}
      {canCancel && (
        <div className="pickup-cancel-row">
          <button
            type="button"
            className="quiet-text-button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Cancel this pickup request? The textile will return to recommended status.')) {
                act('cancel');
              }
            }}
          >
            Cancel this request
          </button>
        </div>
      )}

      {/* Inspection result */}
      {pickup.inspection?.finalPathway && (
        <div className="outcome-card outcome-confirmed">
          <CheckCircle2 size={18} color="var(--green)" />
          <div>
            <span className="eyebrow">CONFIRMED OUTCOME</span>
            <p>
              <strong>{pickup.inspection.finalPathway}</strong> · {pickup.inspection.actualWeightKg} kg received
              {pickup.inspection.verifiedMaterial && ` · ${pickup.inspection.verifiedMaterial}`}
              {pickup.inspection.actualCondition && ` · ${pickup.inspection.actualCondition}`}
            </p>
            {pickup.inspection.processingNotes && <p className="outcome-notes">{pickup.inspection.processingNotes}</p>}
            {pickup.inspectedAt && <p className="outcome-date">Recorded {new Date(pickup.inspectedAt).toLocaleString()}</p>}
          </div>
        </div>
      )}

      {pickup.inspection?.rejectionReason && (
        <div className="outcome-card outcome-rejected">
          <XCircle size={18} color="#bd6047" />
          <div>
            <span className="eyebrow">REJECTION</span>
            <p>
              <strong>{pickup.inspection.rejectionKind === 'processing_unsuccessful' ? 'Processing unsuccessful' : 'Handover rejected'}</strong>:
              {' '}{pickup.inspection.rejectionReason}
            </p>
            {pickup.inspection.processingNotes && <p className="outcome-notes">{pickup.inspection.processingNotes}</p>}
            {pickup.inspectedAt && <p className="outcome-date">Recorded {new Date(pickup.inspectedAt).toLocaleString()}</p>}
          </div>
        </div>
      )}

      <section className="history-section">
        <div className="history-heading">
          <div><span className="eyebrow">TRACEABILITY</span><h2>Record history</h2></div>
          <span>{history.length} {history.length === 1 ? 'event' : 'events'}</span>
        </div>
        <Timeline events={history} />
      </section>

      {/* Collection timestamp */}
      {pickup.collectedAt && (
        <p className="collection-timestamp">
          <CheckCircle2 size={13} /> Collected on {new Date(pickup.collectedAt).toLocaleString()}
        </p>
      )}
    </section>
  );
}
