import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <Compass size={64} color="var(--cyan-500)" style={{ margin: '0 auto 1rem' }} />
      <h1 style={{ fontSize: '2rem' }}>Page not found</h1>
      <p className="text-muted mb-4">The page you're looking for has drifted off the map.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
