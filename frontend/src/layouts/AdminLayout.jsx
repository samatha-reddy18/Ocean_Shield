import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, ClipboardList, FileText, BarChart3, LogOut, Shield } from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  // Additional admin sub-pages would be added here as the app grows.
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="container" style={{ display: 'flex', flex: 1, gap: '1.5rem', paddingTop: '1.5rem' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 230,
            flexShrink: 0,
            display: 'none',
          }}
          data-admin-sidebar
        >
          <div className="card" style={{ padding: '1rem' }}>
            <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--navy-900)' }}>
              <Shield size={18} color="var(--cyan-500)" />
              <strong>Admin Panel</strong>
            </div>
            <nav className="flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.7rem',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: isActive ? 'var(--gray-100)' : 'transparent',
                    color: isActive ? 'var(--navy-900)' : 'var(--text-muted)',
                  })}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 12 }}>
              Signed in as
              <br />
              <strong style={{ color: 'var(--navy-900)' }}>{user?.name}</strong>
            </div>
            <button className="btn btn-secondary full-width mt-4" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* Main admin content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
      <Footer />

      <style>{`
        @media (min-width: 900px) {
          [data-admin-sidebar] { display: block !important; }
        }
      `}</style>
    </div>
  );
}
