import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, MapPin, Camera, Bot, Satellite, BarChart3, ShieldCheck, ArrowRight, Droplets, Recycle, Fish, AlertTriangle } from 'lucide-react';
import { reportApi } from '../services/reportService.js';
import { mapApi } from '../services/mapService.js';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reports, mapData] = await Promise.all([
          reportApi.getReports({ limit: 1 }),
          mapApi.getMapReports(),
        ]);
        setStats({
          total: reports.total,
          mapCount: mapData.count,
        });
      } catch {
        // If the backend is offline, show a graceful placeholder instead of crashing.
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const features = [
    { icon: Camera, title: 'Hazard Reporting', text: 'Submit photos, descriptions, and GPS coordinates of ocean hazards.', color: '#06b6d4' },
    { icon: Bot, title: 'AI Classification', text: 'Computer vision categorizes uploaded images; NLP extracts keywords.', color: '#14b8a6' },
    { icon: MapPin, title: 'Interactive Map', text: 'Visualize incidents on Leaflet with category filters and hotspots.', color: '#3b82f6' },
    { icon: Satellite, title: 'Satellite Monitoring', text: 'Explore Sentinel-1/2 imagery via the Copernicus data ecosystem.', color: '#8b5cf6' },
    { icon: BarChart3, title: 'Analytics', text: 'Trends, category breakdowns, and geographic density from real data.', color: '#f59e0b' },
    { icon: ShieldCheck, title: 'Admin Verification', text: 'Reviewers verify, reject, or request info with a full audit trail.', color: '#22c55e' },
  ];

  const hazardTypes = [
    { icon: Droplets, label: 'Oil Spills' },
    { icon: Recycle, label: 'Plastic Pollution' },
    { icon: Waves, label: 'Marine Debris' },
    { icon: AlertTriangle, label: 'Coastal Pollution' },
    { icon: Fish, label: 'Algal Blooms' },
    { icon: Fish, label: 'Dead Marine Animals' },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background: 'var(--gradient-ocean)',
          color: 'var(--white)',
          padding: '4rem 0 4.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="flex items-center gap-2 mb-4" style={{ opacity: 0.9 }}>
              <Waves color="var(--teal-400)" size={28} />
              <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>OCEANSHIELD AI</span>
            </div>
            <h1 style={{ color: 'var(--white)', fontSize: '2.4rem', lineHeight: 1.15, marginBottom: 16 }}>
              Monitor ocean hazards with community reports and AI
            </h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: 600, marginBottom: 24 }}>
              A platform for citizens, fishermen, researchers, and administrators to report,
              visualize, and investigate environmental hazards in our oceans and coastal waters.
            </p>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ background: 'var(--teal-400)', color: 'var(--navy-900)' }}>
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/map" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }}>
                Explore the Map
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '2.5rem', maxWidth: 600 }}>
            <StatCard label="Total Reports" value={loading ? '—' : stats?.total ?? '0'} />
            <StatCard label="Mapped Incidents" value={loading ? '—' : stats?.mapCount ?? '0'} />
            <StatCard label="Hazard Types" value="6+" />
          </div>
        </div>
      </section>

      {/* Hazard types */}
      <section className="container" style={{ padding: '3rem 1.25rem' }}>
        <h2 className="text-center" style={{ marginBottom: 8 }}>Hazards we track</h2>
        <p className="text-muted text-center mb-4">Reporting and monitoring across six core ocean hazard categories</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {hazardTypes.map((h) => (
            <div key={h.label} className="card text-center" style={{ padding: '1.25rem' }}>
              <h.icon size={28} color="var(--cyan-500)" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--surface)', padding: '3rem 0' }}>
        <div className="container">
          <h2 className="text-center" style={{ marginBottom: 8 }}>Platform capabilities</h2>
          <p className="text-muted text-center mb-4">Community observations, AI-assisted analysis, and geospatial visualization</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {features.map((f) => (
              <div key={f.title} className="card card-hover">
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${f.color}22`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                  }}
                >
                  <f.icon size={22} color={f.color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{f.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.92rem' }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container" style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div className="card" style={{ background: 'var(--gradient-ocean)', color: 'var(--white)', padding: '2.5rem' }}>
          <h2 style={{ color: 'var(--white)' }}>Spotted something on the water?</h2>
          <p style={{ opacity: 0.9, marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
            Your report helps build a clearer picture of ocean health. Every observation contributes to community awareness.
          </p>
          <Link to="/register" className="btn" style={{ background: 'var(--teal-400)', color: 'var(--navy-900)', fontWeight: 700 }}>
            Report a Hazard <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '1rem 1.25rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--teal-400)' }}>{value}</div>
      <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{label}</div>
    </div>
  );
}
