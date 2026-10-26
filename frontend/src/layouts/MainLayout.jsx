import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

export default function MainLayout() {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: '1.5rem' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
