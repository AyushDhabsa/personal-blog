import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

const s = {
  container: {
    maxWidth: 380,
    margin: '0 auto',
    padding: '120px 24px 80px',
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '0.9rem',
    marginBottom: 40,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    color: '#dc2626',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>Admin Login</h1>
      <p style={s.desc}>Sign in to manage your content.</p>

      <form onSubmit={handleSubmit} style={s.form}>
        <div>
          <label style={s.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={s.input}
            placeholder="admin@blog.com"
          />
        </div>
        <div>
          <label style={s.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={s.input}
            placeholder="••••••••"
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
