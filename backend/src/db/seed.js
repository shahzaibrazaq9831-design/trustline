/**
 * Optional helper for local testing only: credits every existing account with
 * a demo balance so you can try transfers without a real deposit channel.
 * Run with: npm run seed
 */
require('dotenv').config();
const db = require('../config/db');

const accounts = db.prepare('SELECT id FROM accounts').all();

const DEMO_AMOUNT_CENTS = 10000000; // 1,00,000.00 (1 lac)

const fund = db.transaction(() => {
  for (const acc of accounts) {
    db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(DEMO_AMOUNT_CENTS, acc.id);
    db.prepare(
      `INSERT INTO transactions (from_account_id, to_account_id, amount_cents, type, description, status)
       VALUES (NULL, ?, ?, 'deposit', 'Demo seed deposit', 'completed')`
    ).run(acc.id, DEMO_AMOUNT_CENTS);
  }
});

fund();
console.log(`Seeded ${accounts.length} account(s) with a 1,00,000.00 demo deposit each.`);