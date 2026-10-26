import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Waves, LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/authService.js';
import { errorMessage } from '../services/api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const expired = new URLSearchParams(location.search).get('expired') === '1';

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await authApi.login({ email: form.email.trim().toLowerCase(), password: form.password });
      login({ _id: data._id, name: data.name, email: data.email, role: data.role, avatarUrl: data.avatarUrl }, data.token);
      // Redirect admins to admin dashboard, others to where they came from
      if (data.role === 'admin') navigate('/admin');
      else navigate(from);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem 3rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="flex items-center gap-2 mb-4" style={{ justifyContent: 'center' }}>
          <Waves color="var(--cyan-500)" size={28} />
          <h2 style={{ margin: 0 }}>Welcome back</h2>
        </div>

        {expired && <div className="alert alert-warning">Your session expired. Please log in again.</div>}
        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-muted" />
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-muted" />
              <input
                type="password"
                className="form-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary full-width" disabled={submitting}>
            <LogIn size={18} /> {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-muted mt-4" style={{ fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
