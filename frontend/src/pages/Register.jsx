import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(fullName, email, password);
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
          <span className="eyebrow">Open an account in minutes</span>
          <h1>A current account, opened on your terms.</h1>
          <p>
            A current account is generated for you automatically — the account number is
            encrypted at rest and only ever shown to you in masked form.
          </p>
        </div>

        <div className="auth-hero-ledger">
          <div>
            <div className="stat-label">Setup time</div>
            <div className="stat-value">&lt; 1 minute</div>
          </div>
          <div>
            <div className="stat-label">Account type</div>
            <div className="stat-value">Current</div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Open an account</h2>
          <p className="subtitle">It takes less than a minute.</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <div className="field-hint">At least 8 characters, including a number.</div>
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="auth-alt">
            Already banking with us? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
