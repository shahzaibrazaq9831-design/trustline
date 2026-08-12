const jwt = require('jsonwebtoken');

/**
 * Verifies the short-lived access token sent as "Authorization: Bearer <token>".
 * Nothing about account balances, account numbers, or other data ever gets
 * embedded in the token itself — it only carries the user id, so a decoded
 * token reveals no financial data even if someone inspected it.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireAuth };
