import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Waves, Menu, X, LogOut, User, Bell, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount, connected } = useRealtime();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const publicLinks = [
    { to: '/', label: 'Home' },
    { to: '/map', label: 'Ocean Map' },
    { to: '/satellite', label: 'Satellite' },
    { to: '/ai-analysis', label: 'AI Analysis' },
  ];

  const authLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/report-hazard', label: 'Report Hazard' },
    { to: '/my-reports', label: 'My Reports' },
  ];

  const adminLink = user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : [];

  const allLinks = [...publicLinks, ...(isAuthenticated ? authLinks : []), ...adminLink];

  return (
    <header
      style={{
        background: 'var(--navy-900)',
        color: 'var(--white)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="container flex items-center justify-between" style={{ height: 64 }}>
        <Link to="/" className="flex items-center gap-2" style={{ color: 'var(--white)', textDecoration: 'none' }}>
          <Waves color="var(--teal-400)" size={28} />
          <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>
            OceanShield <span style={{ color: 'var(--cyan-400)' }}>AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="flex items-center gap-4" style={{ display: 'none' }} data-desktop>
          {allLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--teal-400)' : 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.92rem',
              })}
            >
              {l.label}
            </NavLink>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/notifications" title="Notifications" style={{ color: 'rgba(255,255,255,0.85)', position: 'relative' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -7,
                    background: '#ef4444', color: '#fff',
                    borderRadius: '50%', width: 17, height: 17,
                    fontSize: '0.65rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--navy-900)',
                    lineHeight: 1,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              {/* Live connection indicator dot */}
              <span title={connected ? 'Live updates active' : 'Reconnecting…'} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: connected ? '#22c55e' : '#f59e0b',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span className="flex items-center gap-2" style={{ fontSize: '0.88rem', opacity: 0.9 }}>
                <User size={16} /> {user?.name?.split(' ')[0]}
              </span>
              <button className="btn btn-ghost" onClick={handleLogout} style={{ color: 'var(--white)' }}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-secondary">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="btn btn-ghost"
          onClick={() => setMobileOpen((o) => !o)}
          style={{ color: 'var(--white)', display: 'block' }}
          data-mobile-toggle
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{ background: 'var(--navy-800)', padding: '1rem' }} data-mobile>
          <div className="flex-col gap-2">
            {allLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--teal-400)' : 'var(--white)',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                  fontWeight: 600,
                })}
              >
                {l.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/notifications" onClick={() => setMobileOpen(false)} style={{ color: 'var(--white)', padding: '0.5rem 0' }}>
                  Notifications
                </Link>
                <button className="btn btn-secondary" onClick={() => { handleLogout(); setMobileOpen(false); }} style={{ marginTop: 8 }}>
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <Link to="/login" className="btn btn-secondary flex-1" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/register" className="btn btn-primary flex-1" onClick={() => setMobileOpen(false)}>Register</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive: show desktop nav on larger screens */}
      <style>{`
        @media (min-width: 900px) {
          [data-desktop] { display: flex !important; }
          [data-mobile-toggle] { display: none !important; }
        }
      `}</style>
    </header>
  );
}
