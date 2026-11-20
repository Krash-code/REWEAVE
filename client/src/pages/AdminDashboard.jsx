import { BarChart2, Package, RotateCcw, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span>{label}</span>
        <Icon size={14} className="metric-icon" style={{ color }} />
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function PartnerActivityTable({ partners, onSuspend, suspending }) {
  if (!partners || partners.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 12 }}>No partner activity recorded yet.</p>;
  }

  return (
    <div className="partner-table-wrap">
      <table className="partner-table">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Location</th>
            <th>Total Requests</th>
            <th>Confirmed</th>
            <th>Rejected</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((row) => {
            const partner = row.partner;
            if (!partner) return null;
            const isActive = partner.isActive !== false;

            return (
              <tr key={partner._id}>
                <td>
                  <strong>{partner.name}</strong>
                  {partner.verificationStatus && (
                    <span className={`partner-badge partner-badge-${partner.verificationStatus}`} style={{ marginLeft: 8 }}>
                      {partner.verificationStatus}
                    </span>
                  )}
                </td>
                <td className="table-subtext">{partner.location?.city || '—'}</td>
                <td><strong>{row.total}</strong></td>
                <td style={{ color: '#2a6137', fontWeight: 600 }}>{row.confirmed}</td>
                <td style={{ color: '#8e4c39', fontWeight: 600 }}>{row.rejected}</td>
                <td>
                  <span className={`status-badge ${isActive ? 'status-confirmed' : 'status-rejected'}`}>
                    {isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  {isActive ? (
                    <button
                      type="button"
                      className="btn-action btn-reject"
                      disabled={suspending === partner._id}
                      onClick={() => onSuspend(partner._id, false)}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-action btn-verify"
                      disabled={suspending === partner._id}
                      onClick={() => onSuspend(partner._id, true)}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ users }) {
  if (!users || users.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 12 }}>No users registered yet.</p>;
  }

  return (
    <div className="partner-table-wrap">
      <table className="partner-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {users.slice(0, 20).map((user) => (
            <tr key={user._id}>
              <td><strong>{user.name}</strong></td>
              <td className="table-subtext">{user.email}</td>
              <td><span className="capitalize">{user.role}</span></td>
              <td className="table-subtext">{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length > 20 && (
        <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 10 }}>
          Showing 20 of {users.length} users
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [suspending, setSuspending] = useState(null);

  async function load() {
    try {
      const [analyticsRes, usersRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users')
      ]);
      setData(analyticsRes.data.data);
      setUsers(usersRes.data.data.users || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load admin analytics.');
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSuspend(partnerId, isActive) {
    setSuspending(partnerId);
    try {
      await api.patch(`/admin/partners/${partnerId}/suspend`, { isActive });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update partner status.');
    } finally {
      setSuspending(null);
    }
  }

  if (!data && !error) return <section className="page-shell"><Loader label="Loading admin analytics..." /></section>;

  const totals = data?.totals || {};
  const impact = data?.impact || {};

  return (
    <section className="page-shell">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">ADMIN CONSOLE</span>
          <h1>Platform analytics</h1>
          <p>Overview of system-wide activity, users, partners, and recovery metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="primary-link-button" to="/admin/partners">
            Partner verification
          </Link>
          <button type="button" className="btn-outline-sm" onClick={load}>
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Key metrics */}
      <div className="metric-grid">
        <MetricCard icon={Users} label="Total users" value={totals.users || 0} color="#456276" />
        <MetricCard icon={Users} label="Institutions" value={totals.institutions || 0} color="#557d60" />
        <MetricCard icon={Package} label="Verified partners" value={totals.verifiedPartners || 0} color="var(--green)" />
        <MetricCard icon={Package} label="Textiles" value={totals.textiles || 0} color="#8a6527" />
        <MetricCard icon={TrendingUp} label="Handover requests" value={totals.handoverRequests || 0} color="#325d48" />
        <MetricCard icon={BarChart2} label="Collection drives" value={totals.drives || 0} color="#7aaa85" />
      </div>

      {/* Impact summary */}
      {impact && Object.keys(impact).length > 0 && (
        <div style={{ margin: '28px 0' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Recovery impact</h2>
          <div className="metric-grid compact">
            <MetricCard icon={Package} label="Collected (kg)" value={Number(impact.totalCollectedKg ?? 0).toFixed(1)} color="#456276" />
            <MetricCard icon={TrendingUp} label="Recovered (kg)" value={Number(impact.totalRecoveredKg ?? 0).toFixed(1)} color="var(--green)" />
            <MetricCard icon={BarChart2} label="Awaiting outcome (kg)" value={Number(impact.awaitingOutcomeKg ?? 0).toFixed(1)} color="#d4a036" />
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="admin-split">
        <article>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Textile statuses</h2>
          {data?.textilesByStatus && Object.keys(data.textilesByStatus).length > 0 ? (
            <ul className="status-list">
              {Object.entries(data.textilesByStatus).map(([status, count]) => (
                <li key={status}>
                  <span className="capitalize" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={status} />
                  </span>
                  <b>{count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>No textile data yet.</p>
          )}
        </article>

        <article>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Pickup statuses</h2>
          {data?.pickupsByStatus && Object.keys(data.pickupsByStatus).length > 0 ? (
            <ul className="status-list">
              {Object.entries(data.pickupsByStatus).map(([status, count]) => (
                <li key={status}>
                  <span className="capitalize" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={status} />
                  </span>
                  <b>{count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>No pickup data yet.</p>
          )}
        </article>
      </div>

      {/* Partner activity */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Partner activity</h2>
        <PartnerActivityTable
          partners={data?.partnerActivity || []}
          onSuspend={handleSuspend}
          suspending={suspending}
        />
      </div>

      {/* Users */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Recent users</h2>
        <UserTable users={users} />
      </div>
    </section>
  );
}
