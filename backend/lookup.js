require('dotenv').config();
const { decryptField } = require('./src/utils/encryption');
const db = require('./src/config/db');

const rows = db.prepare(
    'SELECT u.email, a.account_number_encrypted FROM accounts a JOIN users u ON u.id = a.user_id'
).all();

rows.forEach((r) => {
    console.log(r.email, '->', decryptField(r.account_number_encrypted));
});