import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import "./Dashboard.css";
import "./Auth.css";

export default function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/accounts");
        setAccounts(data.accounts);
        if (data.accounts[0]) setFromAccountId(String(data.accounts[0].id));
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Unable to load accounts. Please refresh the page.",
        );
      } finally {
        setAccountsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/transactions/transfer", {
        fromAccountId: Number(fromAccountId),
        toAccountNumber,
        amount: Number(amount),
        description,
      });
      setSuccess(data);
      setToAccountNumber("");
      setAmount("");
      setDescription("");
      const refreshed = await api.get("/accounts");
      setAccounts(refreshed.data.accounts);
    } catch (err) {
      setError(
        err.response?.data?.error || "Transfer failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <span className="eyebrow">Move money</span>
        <h1>Send a transfer</h1>
      </div>

      <div
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 28,
          maxWidth: 460,
          boxShadow: "var(--shadow-card)",
          overflow: "visible",
          position: "relative",
        }}
      >
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          {success && (
            <div
              style={{
                background: "var(--success-bg)",
                color: "var(--success)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                marginBottom: 16,
                position: "relative",
              }}
            >
              Transfer completed. New balance:{" "}
              <span className="mono">{success.newBalance}</span>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                style={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontSize: 16,
                  cursor: "pointer",
                }}
                aria-label="Dismiss success"
              >
                ×
              </button>
            </div>
          )}

          <div className="field">
            <label htmlFor="from">From account</label>
            <select
              id="from"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                background: "var(--paper)",
                position: "relative",
                zIndex: 1,
              }}
            >
              {accountsLoading ? (
                <option value="" disabled>
                  Loading accounts...
                </option>
              ) : !accounts.length ? (
                <option value="" disabled>
                  No accounts found
                </option>
              ) : null}
              {accounts.length > 0 && !fromAccountId ? (
                <option value="" disabled>
                  Select an account
                </option>
              ) : null}
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountType} · {a.accountNumberMasked} ·{" "}
                  {Number(a.balance).toFixed(2)} {a.currency}
                </option>
              ))}
            </select>
            {!accountsLoading && !accounts.length && (
              <div className="field-hint" style={{ marginTop: 6 }}>
                Your account list is empty. A current account is created
                automatically when you register. Please refresh the page or
                return to the <Link to="/">overview</Link>.
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="to">Recipient account number</label>
            <input
              id="to"
              value={toAccountNumber}
              onChange={(e) => setToAccountNumber(e.target.value)}
              placeholder="12-digit account number"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="desc">Note (optional)</label>
            <input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for?"
              maxLength={255}
            />
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={submitting || accountsLoading || !accounts.length}
          >
            {submitting ? "Sending…" : "Send transfer"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
