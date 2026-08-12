import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/accounts');
        setAccounts(data.accounts);
        if (data.accounts[0]) {
          const txRes = await api.get(`/transactions/account/${data.accounts[0].id}`);
          setTransactions(txRes.data.transactions.slice(0, 6));
        }
      } catch (err) {
        setError('Could not load your account data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const primary = accounts[0];

  return (
    <Layout>
      <div className="page-header">
        <span className="eyebrow">Overview</span>
        <h1>Your account</h1>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
      {error && <div className="form-error">{error}</div>}

      {!loading && primary && (
        <div className="balance-card">
          <div className="balance-top">
            <div>
              <div className="balance-label">Available balance · {primary.accountType} Account</div>
              <span className="balance-amount mono">
                {Number(primary.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="balance-currency">{primary.currency}</span>
            </div>
            <span className="account-tag">{primary.accountNumberMasked}</span>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <Link className="quick-action" to="/transfer">
          <div className="qa-title">Send money</div>
          <div className="qa-sub">Transfer to another account</div>
        </Link>
        <Link className="quick-action" to="/transactions">
          <div className="qa-title">View history</div>
          <div className="qa-sub">Full transaction ledger</div>
        </Link>
        <div className="quick-action" style={{ cursor: 'default' }}>
          <div className="qa-title">Account number</div>
          <div className="qa-sub mono">{primary?.accountNumberMasked || '—'}</div>
        </div>
      </div>

      <h3 className="section-title">Recent activity</h3>
      <div className="tx-list">
        {transactions.length === 0 && !loading && (
          <div className="empty-state">No transactions yet — send your first transfer to see it here.</div>
        )}
        {transactions.map((t) => (
          <div className="tx-row" key={t.id}>
            <div>
              <div className="tx-desc">{t.description || (t.type === 'deposit' ? 'Deposit' : 'Transfer')}</div>
              <div className="tx-meta">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div className={`tx-amount ${t.direction}`}>
              {t.direction === 'credit' ? '+' : '−'}{Number(t.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
