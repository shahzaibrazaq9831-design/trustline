import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-hero-brand">
          <span className="brand-mark">TB</span>
          <span className="brand-name">Trustline</span>
        </div>

        <div className="auth-hero-copy">
          <span className="eyebrow">Digital banking, done plainly</span>
          <h1>Every rupee, accounted for.</h1>
          <p>
            Track balances, move money between accounts, and see your full transaction
            ledger — built on encrypted storage and short-lived sessions from day one.
          </p>
        </div>

        <div className="auth-hero-ledger">
          <div>
            <div className="stat-label">Encryption</div>
            <div className="stat-value">AES-256-GCM</div>
          </div>
          <div>
            <div className="stat-label">Session</div>
            <div className="stat-value">JWT · 15 min</div>
          </div>
          <div>
            <div className="stat-label">Passwords</div>
            <div className="stat-value">bcrypt · 12 rounds</div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="subtitle">Log in to view your accounts.</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <p className="auth-alt">
            New to Trustline? <Link to="/register">Open an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
