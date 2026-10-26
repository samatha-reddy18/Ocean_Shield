import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Files, Map, Satellite, Bell } from 'lucide-react';

// Reusable sidebar for authenticated (non-admin) users.
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/report-hazard', label: 'Report Hazard', icon: FilePlus },
  { to: '/my-reports', label: 'My Reports', icon: Files },
  { to: '/map', label: 'Ocean Map', icon: Map },
  { to: '/satellite', label: 'Satellite', icon: Satellite },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar() {
  return (
    <aside style={{ width: 220, flexShrink: 0, display: 'none' }} data-sidebar>
      <nav className="flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: isActive ? 'var(--gray-100)' : 'transparent',
              color: isActive ? 'var(--navy-900)' : 'var(--text-muted)',
            })}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <style>{`
        @media (min-width: 900px) {
          [data-sidebar] { display: block !important; }
        }
      `}</style>
    </aside>
  );
}
