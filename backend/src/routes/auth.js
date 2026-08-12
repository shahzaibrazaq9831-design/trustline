const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

router.post(
  '/register',
  authLimiter,
  [
    body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Enter your full name.'),
    body('email').trim().isEmail().withMessage('Enter a valid email.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/\d/)
      .withMessage('Password must include at least one number.'),
  ],
  validate,
  auth.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Enter a valid email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  auth.login
);

router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

module.exports = router;
