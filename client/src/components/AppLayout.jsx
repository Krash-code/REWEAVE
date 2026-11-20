import { ArrowUpRight, LogOut, Plus, Repeat2 } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { homePath } from '../utils/navigation.js';

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to={homePath(user)}>
          <span className="brand-mark"><Repeat2 size={19} strokeWidth={2.4} /></span>
          REWEAVE
        </Link>
        <div className="topbar-right">
          <span className="topbar-note">A better next chapter for textiles</span>
          {user ? (
            <>
              <nav className="textile-nav" aria-label="Textile navigation">
                {user.role !== 'partner' && <NavLink to="/textiles">My textiles</NavLink>}
                {user.role !== 'partner' && user.role !== 'admin' && (
                  <NavLink className="nav-register" to="/textiles/new"><Plus size={14} /> Register</NavLink>
                )}
                {user.role === 'partner' && <NavLink to="/partner">Partner desk</NavLink>}
                <NavLink to="/impact">Impact</NavLink>
                <NavLink to="/drives">Drives</NavLink>
                {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                {user.role === 'admin' && <NavLink to="/admin/partners">Partners</NavLink>}
              </nav>
              <NotificationBell />
              <button className="quiet-button" onClick={logout} aria-label="Sign out" title="Sign out">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <Link className="topbar-link" to="/login">Sign in <ArrowUpRight size={15} /></Link>
              <Link className="topbar-link" to="/login/admin">Admin</Link>
            </>
          )}
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer"><span>REWEAVE</span><span>Keep materials in motion.</span></footer>
    </div>
  );
}
