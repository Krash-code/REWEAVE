import { Check, CheckCircle2, MapPin, Plus, ShieldAlert, ShieldCheck, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import PartnerVerificationBadge from '../components/PartnerVerificationBadge.jsx';

const ALL_PATHWAYS = ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling'];

export default function AdminPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New partner form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    city: '',
    state: '',
    supportedPathways: ['reuse', 'donation'],
    capacityKgPerMonth: 1000
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, [filter]);

  async function fetchPartners() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter !== 'all') params.verificationStatus = filter;
      const { data } = await api.get('/partners', { params });
      setPartners(data.data.partners || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load partners.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(partnerId, status) {
    setActionLoadingId(partnerId);
    try {
      await api.patch(`/partners/${partnerId}/verify`, { status });
      await fetchPartners();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update partner status`);
    } finally {
      setActionLoadingId(null);
    }
  }

  function handlePathwayToggle(pathway) {
    setFormData((prev) => {
      const exists = prev.supportedPathways.includes(pathway);
      return {
        ...prev,
        supportedPathways: exists
          ? prev.supportedPathways.filter((p) => p !== pathway)
          : [...prev.supportedPathways, pathway]
      };
    });
  }

  async function handleAddPartner(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (formData.supportedPathways.length === 0) {
      setFormError('Please select at least one supported pathway');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.post('/partners', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
        location: {
          city: formData.city,
          state: formData.state
        },
        supportedPathways: formData.supportedPathways,
        capacityKgPerMonth: Number(formData.capacityKgPerMonth || 1000),
        verificationStatus: 'verified' // Admins create already-verified partners
      });

      setFormSuccess('Partner created and verified successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        description: '',
        city: '',
        state: '',
        supportedPathways: ['reuse', 'donation'],
        capacityKgPerMonth: 1000
      });
      setShowAddForm(false);
      await fetchPartners();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create partner');
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <section className="page-shell admin-partners-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Partner Verification & Registry</h1>
          <p>Verify organizations, review accepted recovery pathways, and manage circular capacity.</p>
        </div>
        <button
          type="button"
          className="primary-link-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X size={15} /> : <Plus size={15} />}
          {showAddForm ? 'Close Form' : 'Register New Partner'}
        </button>
      </div>

      {formSuccess && <div className="form-success">{formSuccess}</div>}

      {showAddForm && (
        <form className="textile-form partner-add-form" onSubmit={handleAddPartner}>
          <div className="form-section-heading">
            <span>01</span>
            <h2>Onboard Verified Partner</h2>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="textile-form-grid">
            <div className="field-block">
              <label>Organization / Partner Name</label>
              <input
                className="form-control"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. GreenThread Recycling Hub"
              />
            </div>

            <div className="field-block">
              <label>Contact Email</label>
              <input
                type="email"
                className="form-control"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="partner@example.org"
              />
            </div>

            <div className="field-block">
              <label>Phone Number (Optional)</label>
              <input
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="field-block">
              <label>Monthly Capacity (kg)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={formData.capacityKgPerMonth}
                onChange={(e) => setFormData({ ...formData, capacityKgPerMonth: e.target.value })}
              />
            </div>

            <div className="field-block">
              <label>City</label>
              <input
                className="form-control"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Bengaluru"
              />
            </div>

            <div className="field-block">
              <label>State</label>
              <input
                className="form-control"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Karnataka"
              />
            </div>

            <div className="field-block field-wide">
              <label>Supported Circular Pathways</label>
              <div className="pathway-checkbox-group">
                {ALL_PATHWAYS.map((p) => (
                  <label key={p} className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={formData.supportedPathways.includes(p)}
                      onChange={() => handlePathwayToggle(p)}
                    />
                    <span className="capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field-block field-wide">
              <label>Description / Capabilities</label>
              <input
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Specializes in mechanical fiber recovery, accepts post-consumer cotton..."
              />
            </div>
          </div>

          <div className="form-actions">
            <span>Admin-created partners are automatically set to Verified.</span>
            <button type="submit" className="submit-button" disabled={formSubmitting}>
              {formSubmitting ? 'Saving…' : 'Save & Verify Partner'}
            </button>
          </div>
        </form>
      )}

      <div className="list-toolbar">
        <div className="filter-tabs" role="tablist">
          {['all', 'pending', 'verified', 'rejected'].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-tab ${filter === status ? 'is-active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All Partners' : status}
            </button>
          ))}
        </div>
        <span className="list-count">{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
      </div>

      {loading ? (
        <Loader label="Loading partners..." />
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : partners.length === 0 ? (
        <div className="textile-empty-state">
          <span className="empty-mark">NO PARTNERS</span>
          <h2>No {filter !== 'all' ? filter : ''} partners found.</h2>
          <p>Add partners above or change the filter to see organizations in the registry.</p>
        </div>
      ) : (
        <div className="partner-table-wrap">
          <table className="partner-table">
            <thead>
              <tr>
                <th>Partner Organization</th>
                <th>Location</th>
                <th>Supported Pathways</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner._id}>
                  <td>
                    <strong>{partner.name}</strong>
                    <span className="table-subtext">{partner.email}</span>
                  </td>
                  <td>
                    <div className="table-icon-text">
                      <MapPin size={13} />
                      <span>{partner.location?.city}{partner.location?.state ? `, ${partner.location.state}` : ''}</span>
                    </div>
                  </td>
                  <td>
                    <div className="pathway-tags">
                      {partner.supportedPathways.map((p) => (
                        <span key={p} className="pathway-tag">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="table-capacity">
                      {partner.capacityKgPerMonth ? `${partner.capacityKgPerMonth.toLocaleString()} kg/mo` : 'Unlimited'}
                    </span>
                  </td>
                  <td>
                    <PartnerVerificationBadge status={partner.verificationStatus} />
                  </td>
                  <td>
                    <div className="action-buttons">
                      {partner.verificationStatus !== 'verified' && (
                        <button
                          type="button"
                          className="btn-action btn-verify"
                          disabled={actionLoadingId === partner._id}
                          onClick={() => handleVerify(partner._id, 'verified')}
                          title="Verify partner"
                        >
                          <Check size={13} /> Verify
                        </button>
                      )}
                      {partner.verificationStatus !== 'rejected' && (
                        <button
                          type="button"
                          className="btn-action btn-reject"
                          disabled={actionLoadingId === partner._id}
                          onClick={() => handleVerify(partner._id, 'rejected')}
                          title="Reject partner"
                        >
                          <X size={13} /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
