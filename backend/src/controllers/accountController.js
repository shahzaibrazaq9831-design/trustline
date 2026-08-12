const db = require('../config/db');
const { decryptField, maskAccountNumber } = require('../utils/encryption');

function toDollarsView(cents) {
  return (cents / 100).toFixed(2);
}

/** Lists only the accounts belonging to the authenticated user — never anyone else's. */
function listMyAccounts(req, res) {
  const accounts = db
    .prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id')
    .all(req.userId);

  const view = accounts.map((a) => ({
    id: a.id,
    accountType: a.account_type,
    accountNumberMasked: maskAccountNumber(decryptField(a.account_number_encrypted)),
    balance: toDollarsView(a.balance_cents),
    currency: a.currency,
    createdAt: a.created_at,
  }));

  return res.json({ accounts: view });
}

/** Fetch one account — but only if it belongs to the requesting user. */
function getAccount(req, res) {
  const account = db
    .prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!account) return res.status(404).json({ error: 'Account not found.' });

  return res.json({
    id: account.id,
    accountType: account.account_type,
    accountNumberMasked: maskAccountNumber(decryptField(account.account_number_encrypted)),
    balance: toDollarsView(account.balance_cents),
    currency: account.currency,
  });
}

module.exports = { listMyAccounts, getAccount };
