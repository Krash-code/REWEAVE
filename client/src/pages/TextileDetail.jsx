import { ArrowLeft, CheckCircle2, Clock, MapPin, Scale, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import MatchedPartnerCard from '../components/MatchedPartnerCard.jsx';
import PathwayCard from '../components/PathwayCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Timeline from '../components/Timeline.jsx';

const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/** Statuses past which the "Get recommendations" button is hidden. */
const POST_RECOMMENDATION_STATUSES = ['requested', 'collected', 'confirmed', 'awaiting_match', 'rejected', 'cancelled'];

export default function TextileDetail() {
  const { id } = useParams();
  const [textile, setTextile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommending, setRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState('');

  // Step 4: Matching state
  const [matches, setMatches] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchingError, setMatchingError] = useState('');
  const [submittingMatchPathway, setSubmittingMatchPathway] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [schedule, setSchedule] = useState({
    scheduledDate: '',
    timeSlot: '10:00-12:00',
    transferType: 'pickup',
    street: '',
    city: '',
    notes: ''
  });
  const [scheduleError, setScheduleError] = useState('');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/textiles/${id}`), api.get(`/textiles/${id}/history`)])
      .then(([record, history]) => {
        if (!active) return;
        const currentTextile = record.data.data.textile;
        setTextile(currentTextile);
        setPickup(record.data.data.pickup || null);
        setEvents(history.data.data.events);
        if (currentTextile.location?.city) {
          setSchedule((current) => ({ ...current, city: currentTextile.location.city }));
        }

        // If textile has recommended pathways and is in matching stage, fetch partner matches
        if (
          currentTextile.recommendedPathways?.length > 0 &&
          ['recommended', 'awaiting_match'].includes(currentTextile.status)
        ) {
          fetchMatches(id);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load this textile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function fetchMatches(textileId) {
    setLoadingMatches(true);
    setMatchingError('');
    try {
      const { data } = await api.get(`/textiles/${textileId}/matches`);
      setMatches(data.data);
    } catch (err) {
      setMatchingError(err.response?.data?.message || 'Failed to find matching partners');
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleRecommend() {
    setRecommending(true);
    setRecommendError('');
    try {
      const { data } = await api.post(`/textiles/${id}/recommend`);
      const updated = data.data.textile;
      setTextile(updated);
      const history = await api.get(`/textiles/${id}/history`);
      setEvents(history.data.data.events);
      await fetchMatches(id);
    } catch (err) {
      setRecommendError(err.response?.data?.message || 'Could not get recommendations. Please try again.');
    } finally {
      setRecommending(false);
    }
  }

  async function handleRequestMatch(pathway, partnerId = null) {
    setSubmittingMatchPathway(pathway);
    try {
      const { data } = await api.post(`/textiles/${id}/request-match`, { pathway, partnerId });
      setTextile(data.data.textile);
      const [history, detail] = await Promise.all([
        api.get(`/textiles/${id}/history`),
        api.get(`/textiles/${id}`)
      ]);
      setEvents(history.data.data.events);
      setPickup(detail.data.data.pickup || null);
      setMatches(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request partner match');
    } finally {
      setSubmittingMatchPathway(null);
    }
  }

  async function handleSchedule(event) {
    event.preventDefault();
    if (!pickup) return;
    setScheduling(true);
    setScheduleError('');
    try {
      const { data } = await api.patch(`/pickups/${pickup._id}/schedule`, {
        scheduledDate: schedule.scheduledDate,
        timeSlot: schedule.timeSlot,
        transferType: schedule.transferType,
        pickupAddress: { street: schedule.street, city: schedule.city || textile?.location?.city },
        notes: schedule.notes
      });
      setPickup(data.data.pickup);
      const history = await api.get(`/textiles/${id}/history`);
      setEvents(history.data.data.events);
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Could not save schedule.');
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelPickup() {
    if (!pickup) return;
    setScheduling(true);
    try {
      await api.patch(`/pickups/${pickup._id}/cancel`);
      const [record, history] = await Promise.all([api.get(`/textiles/${id}`), api.get(`/textiles/${id}/history`)]);
      setTextile(record.data.data.textile);
      setPickup(record.data.data.pickup || null);
      setEvents(history.data.data.events);
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Could not cancel pickup.');
    } finally {
      setScheduling(false);
    }
  }

  if (loading) return <section className="page-shell"><Loader label="Loading textile record..." /></section>;
  if (error) return (
    <section className="page-shell detail-error">
      <Link className="back-link" to="/textiles"><ArrowLeft size={15} /> My textiles</Link>
      <div className="form-error" role="alert">{error}</div>
    </section>
  );

  const showRecommendButton = !POST_RECOMMENDATION_STATUSES.includes(textile.status);
  const hasPathways = textile.recommendedPathways?.length > 0;
  const canMatch = ['recommended', 'awaiting_match'].includes(textile.status);
  const canSchedule = pickup && ['requested', 'scheduled'].includes(pickup.status) && ['requested'].includes(textile.status);

  return (
    <section className="page-shell detail-page">
      <Link className="back-link" to="/textiles"><ArrowLeft size={15} /> My textiles</Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">TEXTILE PASSPORT / {textile.refId}</span>
          <h1>{textile.itemType}</h1>
          <StatusBadge status={textile.status} />
          {pickup && <StatusBadge status={pickup.status} />}
        </div>
        <div className="passport-tools">
          <img className="qr-image" src={`${apiOrigin}/api/passports/${textile.refId}/qr`} alt={`QR code for ${textile.refId}`} />
          <Link className="text-link" to={`/p/${textile.refId}`}>Public passport</Link>
          <span className="detail-created">Added {new Date(textile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Requested Partner Banner */}
      {textile.status === 'requested' && textile.matchedPartner && (
        <div className="handover-banner">
          <div className="handover-icon"><CheckCircle2 size={24} /></div>
          <div className="handover-content">
            <span className="eyebrow">PARTNER MATCHED & HANDOVER REQUESTED</span>
            <h3>Assigned Partner: {textile.matchedPartner.name}</h3>
            <p>
              Selected pathway: <strong>{textile.selectedPathway}</strong>. 
              {textile.matchedPartner.location?.city && ` Location: ${textile.matchedPartner.location.city}.`}
              {textile.matchedPartner.phone && ` Phone: ${textile.matchedPartner.phone}.`}
            </p>
          </div>
        </div>
      )}

      {/* Awaiting Match Banner */}
      {textile.status === 'awaiting_match' && (
        <div className="awaiting-match-banner">
          <div className="awaiting-icon"><Clock size={24} /></div>
          <div className="awaiting-content">
            <span className="eyebrow">QUEUED FOR MATCHING</span>
            <h3>Awaiting Partner Availability</h3>
            <p>
              This textile is flagged as awaiting an accepting partner for pathway: <strong>{textile.selectedPathway || 'circular recovery'}</strong>.
              You will be notified once a verified partner confirms capacity in your region.
            </p>
          </div>
        </div>
      )}

      {textile.photos.length > 0 && (
        <div className="detail-photo-grid">
          {textile.photos.map((photo, index) => <img key={photo} src={`${apiOrigin}${photo}`} alt={`${textile.itemType}, photo ${index + 1}`} />)}
        </div>
      )}

      <div className="detail-data-grid">
        <div className="detail-data-main">
          <span className="eyebrow">ITEM INFORMATION</span>
          <dl className="detail-facts">
            <div><dt>Material</dt><dd>{textile.material}</dd></div>
            <div><dt>Condition</dt><dd>{textile.condition}</dd></div>
            <div><dt>Quantity</dt><dd>{textile.quantity} {textile.quantityUnit}</dd></div>
            <div><dt>Estimated weight</dt><dd><Scale size={14} /> {textile.estimatedWeightKg == null ? 'Not provided' : `${textile.estimatedWeightKg} kg`}</dd></div>
            <div><dt>Location</dt><dd><MapPin size={14} /> {textile.location.city}{textile.location.state ? `, ${textile.location.state}` : ''}</dd></div>
          </dl>
        </div>
        <aside className="detail-note">
          <span className="eyebrow">CURRENTLY RECORDED</span>
          <p>
            {textile.status === 'registered' && 'This textile is registered. Run the engine to see circular recovery pathways.'}
            {textile.status === 'recommended' && 'Recommendations generated. Select a verified partner below to schedule handover.'}
            {textile.status === 'requested' && `Handover requested with ${textile.matchedPartner?.name || 'partner'}. Pickup status: ${pickup?.status || 'requested'}.`}
            {textile.status === 'awaiting_match' && 'No verified partner currently available; queued for matching.'}
            {textile.status === 'collected' && 'Partner confirmed physical collection. Inspection and final outcome are pending.'}
            {textile.status === 'confirmed' && 'Partner verified the recovery outcome. This quantity can appear on the impact dashboard.'}
            {textile.status === 'rejected' && 'Partner rejected this handover after inspection. Rejected weight is excluded from recovered totals.'}
            {textile.status === 'cancelled' && 'This handover was cancelled.'}
          </p>
        </aside>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CIRCULARITY RECOMMENDATIONS                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="recommendations-section">
        <div className="recommendations-heading">
          <div>
            <span className="eyebrow">CIRCULARITY ENGINE</span>
            <h2>Suggested pathways</h2>
          </div>
          {showRecommendButton && (
            <button
              className="recommend-button"
              onClick={handleRecommend}
              disabled={recommending}
              aria-busy={recommending}
            >
              <Sparkles size={14} aria-hidden="true" />
              {recommending ? 'Analysing…' : hasPathways ? 'Refresh recommendations' : 'Get recommendations'}
            </button>
          )}
        </div>

        {recommendError && (
          <div className="form-error" role="alert">{recommendError}</div>
        )}

        {hasPathways ? (
          <>
            <p className="recommendations-notice">
              These are suggestions only. The receiving partner confirms acceptance and the final outcome.
            </p>
            <div className="pathway-grid">
              {textile.recommendedPathways.map((p) => (
                <PathwayCard
                  key={p.pathway}
                  pathway={p.pathway}
                  confidence={p.confidence}
                  reason={p.reason}
                />
              ))}
            </div>
          </>
        ) : (
          !showRecommendButton && (
            <p className="recommendations-empty">No recommendations were recorded at this stage.</p>
          )
        )}

        {!hasPathways && showRecommendButton && (
          <p className="recommendations-empty">
            Run the engine to see suggested circularity pathways for this textile.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4: PARTNER MATCHING                                            */}
      {/* ------------------------------------------------------------------ */}
      {hasPathways && canMatch && (
        <section className="matching-section">
          <div className="matching-heading">
            <div>
              <span className="eyebrow">STEP 4: PARTNER MATCHING</span>
              <h2>Verified Partner Options</h2>
              <p>Matched by local proximity, material capability, and available capacity.</p>
            </div>
          </div>

          {loadingMatches ? (
            <Loader label="Searching verified partner network..." />
          ) : matchingError ? (
            <div className="form-error">{matchingError}</div>
          ) : matches ? (
            <div className="matching-pathways-list">
              {matches.pathwayMatches.map((pathwayGroup) => (
                <div key={pathwayGroup.pathway} className="matching-group-card">
                  <div className="matching-group-header">
                    <div>
                      <span className="eyebrow">PATHWAY: {pathwayGroup.pathway.toUpperCase()}</span>
                      <h3>{pathwayGroup.partners.length} Partner{pathwayGroup.partners.length === 1 ? '' : 's'} Available</h3>
                    </div>
                    {pathwayGroup.status === 'awaiting_match' && (
                      <span className="status-badge status-awaiting_match">Awaiting Match</span>
                    )}
                  </div>

                  {pathwayGroup.partners.length > 0 ? (
                    <div className="matched-partners-grid">
                      {pathwayGroup.partners.map((partner) => (
                        <MatchedPartnerCard
                          key={partner._id}
                          partner={partner}
                          pathway={pathwayGroup.pathway}
                          isSubmitting={submittingMatchPathway === pathwayGroup.pathway}
                          onSelect={handleRequestMatch}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="no-partner-box">
                      <p>{pathwayGroup.statusMessage}</p>
                      <button
                        type="button"
                        className="btn-flag-awaiting"
                        disabled={submittingMatchPathway === pathwayGroup.pathway}
                        onClick={() => handleRequestMatch(pathwayGroup.pathway, null)}
                      >
                        {submittingMatchPathway === pathwayGroup.pathway ? 'Flagging…' : `Flag as Awaiting Match for ${pathwayGroup.pathway}`}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {canSchedule && (
        <section className="logistics-section">
          <span className="eyebrow">STEP 5: PICKUP & LOGISTICS</span>
          <h2>Schedule collection</h2>
          <p>The textile stays <strong>requested</strong> until the partner confirms collection. Scheduling only updates the pickup record.</p>
          {scheduleError && <div className="form-error">{scheduleError}</div>}
          <form className="textile-form" onSubmit={handleSchedule}>
            <div className="textile-form-grid">
              <label className="form-label">Pickup or drop-off
                <select className="form-select" value={schedule.transferType} onChange={(e) => setSchedule({ ...schedule, transferType: e.target.value })}>
                  <option value="pickup">Pickup</option>
                  <option value="drop_off">Self drop-off</option>
                </select>
              </label>
              <label className="form-label">Preferred date
                <input className="form-control" type="date" required value={schedule.scheduledDate} onChange={(e) => setSchedule({ ...schedule, scheduledDate: e.target.value })} />
              </label>
              <label className="form-label">Time slot
                <input className="form-control" value={schedule.timeSlot} onChange={(e) => setSchedule({ ...schedule, timeSlot: e.target.value })} />
              </label>
              <label className="form-label">City
                <input className="form-control" value={schedule.city} onChange={(e) => setSchedule({ ...schedule, city: e.target.value })} />
              </label>
            </div>
            <label className="form-label">Pickup address or drop-off location
              <input className="form-control" value={schedule.street} onChange={(e) => setSchedule({ ...schedule, street: e.target.value })} />
            </label>
            <label className="form-label">Logistics instructions
              <input className="form-control" value={schedule.notes} onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })} />
            </label>
            <div className="form-actions">
              <button className="submit-button" type="submit" disabled={scheduling}>{scheduling ? 'Saving…' : 'Save schedule'}</button>
              <button type="button" className="quiet-text-button" disabled={scheduling} onClick={handleCancelPickup}>Cancel request</button>
            </div>
          </form>
        </section>
      )}

      {pickup && ['collected', 'confirmed', 'rejected'].includes(pickup.status) && (
        <section className="logistics-section">
          <span className="eyebrow">HANDOVER OUTCOME</span>
          <h2>Pickup {pickup.status}</h2>
          {pickup.collectedAt && <p>Collected {new Date(pickup.collectedAt).toLocaleString()}</p>}
          {pickup.inspection?.finalPathway && <p>Final pathway: {pickup.inspection.finalPathway} · {pickup.inspection.actualWeightKg} kg</p>}
          {pickup.inspection?.rejectionReason && <p>Rejection ({pickup.inspection.rejectionKind || 'handover'}): {pickup.inspection.rejectionReason}</p>}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TRACEABILITY HISTORY                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="history-section">
        <div className="history-heading">
          <div><span className="eyebrow">TRACEABILITY</span><h2>Record history</h2></div>
          <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
        </div>
        <Timeline events={events} />
      </section>
    </section>
  );
}
