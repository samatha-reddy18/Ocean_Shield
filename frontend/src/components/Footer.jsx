import { Link } from 'react-router-dom';
import { Waves } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--navy-900)',
        color: 'rgba(255,255,255,0.7)',
        marginTop: '3rem',
        padding: '2rem 0 1.5rem',
      }}
    >
      <div className="container">
        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--white)' }}>
          <Waves color="var(--teal-400)" size={24} />
          <strong style={{ fontSize: '1.05rem' }}>OceanShield AI</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--white)', fontSize: '0.9rem', marginBottom: 8 }}>Platform</h4>
            <div className="flex-col gap-2" style={{ fontSize: '0.85rem' }}>
              <Link to="/map" style={{ color: 'rgba(255,255,255,0.7)' }}>Ocean Hazard Map</Link>
              <Link to="/report-hazard" style={{ color: 'rgba(255,255,255,0.7)' }}>Report a Hazard</Link>
              <Link to="/satellite" style={{ color: 'rgba(255,255,255,0.7)' }}>Satellite Monitoring</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--white)', fontSize: '0.9rem', marginBottom: 8 }}>Resources</h4>
            <div className="flex-col gap-2" style={{ fontSize: '0.85rem' }}>
              <Link to="/ai-analysis" style={{ color: 'rgba(255,255,255,0.7)' }}>AI Analysis</Link>
              <a href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.7)' }}>Copernicus Data Space</a>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--white)', fontSize: '0.9rem', marginBottom: 8 }}>About</h4>
            <p style={{ fontSize: '0.82rem', maxWidth: 280 }}>
              A community + AI platform for monitoring ocean and coastal hazards. Supports investigation,
              not official inspection or emergency response.
            </p>
          </div>
        </div>
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} OceanShield AI — Environmental Monitoring Platform
        </div>
      </div>
    </footer>
  );
}
