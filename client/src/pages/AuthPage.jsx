import { ArrowRight, Check, LockKeyhole, Repeat2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath } from '../utils/navigation.js';

export default function AuthPage({ mode, adminOnly = false }) {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'individual' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={dashboardPath(user)} replace />;

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const account = await (isRegister ? register(form) : login({ email: form.email, password: form.password }));
      navigate(dashboardPath(account), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not connect. Check the API and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-story">
        <div className="story-kicker"><span /> CIRCULAR TEXTILE EXCHANGE</div>
        <h1>Give good<br /><em>things</em> another<br />beginning.</h1>
        <p>Bring useful textiles back into circulation, one considered next step at a time.</p>
        <div className="story-foot"><span className="story-icon"><Repeat2 size={18} /></span><span>Register <b>·</b> Recommend <b>·</b> Recover</span></div>
        <div className="fabric-shape" aria-hidden="true"><div /><div /><div /></div>
        <span className="story-index">01 / A MORE CIRCULAR WAY</span>
      </div>

      <div className="auth-panel">
        <div className="auth-heading">
          <span className="mobile-mark"><Repeat2 size={20} /> REWEAVE</span>
          {adminOnly ? (
            <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><ShieldCheck size={12} /> ADMIN ACCESS</span>
          ) : (
            <span className="eyebrow">{isRegister ? 'JOIN THE EXCHANGE' : 'WELCOME BACK'}</span>
          )}
          <h2>{adminOnly ? 'Admin sign in' : isRegister ? 'Make room for better.' : 'Pick up where you left off.'}</h2>
          <p>{adminOnly ? 'Use the dedicated admin account to review partners and manage the platform.' : isRegister ? 'Create an account to find the right next use for your textiles.' : 'Sign in to follow your textiles on their next journey.'}</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {isRegister && (
            <>
              <label className="form-label" htmlFor="name">Your name</label>
              <input id="name" name="name" className="form-control" autoComplete="name" value={form.name} onChange={update} required maxLength={100} />
            </>
          )}
          <label className="form-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" className="form-control" autoComplete="email" value={form.email} onChange={update} required />

          {!adminOnly && isRegister && (
            <>
              <label className="form-label" htmlFor="role">Account type</label>
              <select id="role" name="role" className="form-select" value={form.role} onChange={update}>
                <option value="individual">Individual or household</option>
                <option value="institution">College or organization</option>
                <option value="partner">Recovery partner</option>
              </select>
            </>
          )}

          <label className="form-label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="form-control" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={update} required minLength={isRegister ? 8 : undefined} />
          {isRegister && <span className="field-hint"><LockKeyhole size={13} /> Use at least 8 characters</span>}

          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? 'One moment...' : isRegister ? 'Create account' : 'Sign in'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="auth-switch">
          {adminOnly ? (
            <>
              Need a customer account? <Link to="/login">Customer sign in</Link>
            </>
          ) : (
            <>
              {isRegister ? 'Already have an account?' : 'New to REWEAVE?'}{' '}
              <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
            </>
          )}
        </div>
        <div className="privacy-note"><Check size={14} /> Your account details stay private.</div>
      </div>
    </section>
  );
}