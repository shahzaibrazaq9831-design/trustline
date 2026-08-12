import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import './Dashboard.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: accData } = await api.get('/accounts');
      if (accData.accounts[0]) {
        const { data } = await api.get(`/transactions/account/${accData.accounts[0].id}`);
        setTransactions(data.transactions);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <span className="eyebrow">Ledger</span>
        <h1>Transaction history</h1>
      </div>

      <div className="tx-list">
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && transactions.length === 0 && (
          <div className="empty-state">No transactions yet.</div>
        )}
        {transactions.map((t) => (
          <div className="tx-row" key={t.id}>
            <div>
              <div className="tx-desc">{t.description || (t.type === 'deposit' ? 'Deposit' : 'Transfer')}</div>
              <div className="tx-meta">{new Date(t.createdAt).toLocaleString()} · {t.status}</div>
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
