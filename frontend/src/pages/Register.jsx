import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Waves, UserPlus, User, Mail, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/authService.js';
import { errorMessage } from '../services/api.js';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      login({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem 3rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 500 }}>
        <div className="flex items-center gap-2 mb-4" style={{ justifyContent: 'center' }}>
          <Waves color="var(--cyan-500)" size={28} />
          <h2 style={{ margin: 0 }}>Create an account</h2>
        </div>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="flex items-center gap-2">
              <User size={18} className="text-muted" />
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

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
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Account Type</label>

            {/* Selectable roles — citizen and researcher only */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {[
                {
                  value: 'citizen',
                  title: 'Citizen',
                  desc: 'Submit and manage personal hazard reports',
                  perms: ['Submit ocean hazard reports', 'Upload photographs and evidence', 'View and manage your own reports', 'Track report review status'],
                },
                {
                  value: 'researcher',
                  title: 'Researcher',
                  desc: 'Explore reports, patterns, and satellite data',
                  perms: ['Browse all public reports and data', 'Explore geographical patterns', 'Access satellite imagery tools', 'View AI analysis and NLP results'],
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'block',
                    border: `2px solid ${form.role === opt.value ? 'var(--cyan-500)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    background: form.role === opt.value ? 'rgba(6,182,212,0.06)' : 'var(--surface)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      style={{ accentColor: 'var(--cyan-500)', width: 16, height: 16, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    {form.role === opt.value && (
                      <CheckCircle2 size={18} color="var(--cyan-500)" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                  {form.role === opt.value && (
                    <ul style={{ marginTop: 10, paddingLeft: 28, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                      {opt.perms.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  )}
                </label>
              ))}
            </div>

            {/* Administrator info block — read-only, not selectable */}
            <div
              style={{
                border: '2px dashed var(--gray-300)',
                borderRadius: 10,
                padding: '0.85rem 1rem',
                background: 'var(--gray-100)',
                opacity: 0.9,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                <ShieldAlert size={18} color="var(--gray-400)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-500)' }}>Administrator</div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      background: 'var(--gray-200)',
                      color: 'var(--gray-500)',
                      borderRadius: 4,
                      padding: '0.1rem 0.45rem',
                      marginTop: 2,
                    }}
                  >
                    Restricted access
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                For the person managing the website. This role cannot be selected during public registration.
              </p>
              <ul style={{ paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>
                <li>Manage user accounts</li>
                <li>Review, verify, or reject reports</li>
                <li>Manage inappropriate or duplicate submissions</li>
                <li>Monitor system activity</li>
                <li>Manage report categories and system settings</li>
              </ul>
            </div>
          </div>

          <button type="submit" className="btn btn-primary full-width" disabled={submitting}>
            <UserPlus size={18} /> {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-muted mt-4" style={{ fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
