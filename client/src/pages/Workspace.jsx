import { ArrowUpRight, PackageOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Workspace() {
  const { user } = useAuth();

  return (
    <section className="workspace-page">
      <div className="workspace-intro">
        <span className="eyebrow">YOUR REWEAVE SPACE</span>
        <h1>Welcome, {user.name.split(' ')[0]}.</h1>
        <p>Your next textile journey starts with a simple first step.</p>
      </div>
      <div className="workspace-grid">
        <div className="workspace-main">
          <div className="workspace-empty-icon"><PackageOpen size={24} /></div>
          <span className="eyebrow">A FRESH START</span>
          <h2>Your textile list is ready.</h2>
          <p>When textile registration is available, your items and their progress will appear here.</p>
          <button className="submit-button" disabled>Register a textile <ArrowUpRight size={16} /></button>
        </div>
        <aside className="workspace-aside">
          <div className="aside-top"><Sparkles size={17} /><span>THE REWEAVE PRINCIPLE</span></div>
          <p>Not everything belongs in the same stream. The right next step depends on material, condition, and a partner who can take it.</p>
          <div className="aside-steps"><span>01 <b>Register</b></span><span>02 <b>Find a route</b></span><span>03 <b>Confirm its next life</b></span></div>
        </aside>
      </div>
    </section>
  );
}