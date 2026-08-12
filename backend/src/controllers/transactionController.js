const db = require('../config/db');
const { decryptField, maskAccountNumber } = require('../utils/encryption');

function toDollarsView(cents) {
  return (cents / 100).toFixed(2);
}

function ownsAccount(accountId, userId) {
  return db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId);
}

/** Transaction history for a specific account owned by the requesting user. */
function listTransactions(req, res) {
  const account = ownsAccount(req.params.accountId, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found.' });

  const rows = db
    .prepare(
      `SELECT * FROM transactions
       WHERE from_account_id = ? OR to_account_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    )
    .all(account.id, account.id);

  const view = rows.map((t) => ({
    id: t.id,
    type: t.type,
    direction: t.from_account_id === account.id ? 'debit' : 'credit',
    amount: toDollarsView(t.amount_cents),
    description: t.description,
    status: t.status,
    createdAt: t.created_at,
  }));

  return res.json({ transactions: view });
}

/**
 * Fund transfer between two accounts. Runs as a single atomic DB transaction:
 * either both the debit and credit succeed, or neither does — the balance can
 * never end up half-updated even if the server crashes mid-request.
 */
function createTransfer(req, res) {
  const { fromAccountId, toAccountNumber, amount, description } = req.body;

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount greater than zero.' });
  }

  const fromAccount = ownsAccount(fromAccountId, req.userId);
  if (!fromAccount) {
    return res.status(404).json({ error: 'Source account not found.' });
  }

  // Find destination account by decrypting candidates — in production, look this
  // up via a separate indexed lookup table keyed by a one-way HMAC of the account
  // number instead of decrypting every row (this demo optimizes for clarity).
  const allAccounts = db.prepare('SELECT * FROM accounts').all();
  const toAccount = allAccounts.find(
    (a) => decryptField(a.account_number_encrypted) === String(toAccountNumber).trim()
  );

  if (!toAccount) {
    return res.status(404).json({ error: 'Recipient account number not found.' });
  }
  if (toAccount.id === fromAccount.id) {
    return res.status(400).json({ error: 'Cannot transfer to the same account.' });
  }

  const runTransfer = db.transaction(() => {
    const source = db.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(fromAccount.id);
    if (source.balance_cents < amountCents) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    db.prepare('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?').run(
      amountCents,
      fromAccount.id
    );
    db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(
      amountCents,
      toAccount.id
    );

    const result = db
      .prepare(
        `INSERT INTO transactions (from_account_id, to_account_id, amount_cents, type, description, status)
         VALUES (?, ?, ?, 'transfer', ?, 'completed')`
      )
      .run(fromAccount.id, toAccount.id, amountCents, description || null);

    return result.lastInsertRowid;
  });

  try {
    const transactionId = runTransfer();
    return res.status(201).json({
      message: 'Transfer completed.',
      transactionId,
      newBalance: toDollarsView(
        db.prepare('SELECT balance_cents FROM accounts WHERE id = ?').get(fromAccount.id).balance_cents
      ),
    });
  } catch (err) {
    if (err.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'Insufficient funds for this transfer.' });
    }
    return res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
}

module.exports = { listTransactions, createTransfer };
