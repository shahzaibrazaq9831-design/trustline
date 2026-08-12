const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const tx = require('../controllers/transactionController');

const router = express.Router();

router.use(requireAuth);

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

router.get('/account/:accountId', tx.listTransactions);

router.post(
  '/transfer',
  [
    body('fromAccountId').isInt({ min: 1 }).withMessage('Select a source account.'),
    body('toAccountNumber').trim().isLength({ min: 4 }).withMessage('Enter a valid recipient account number.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Enter an amount greater than zero.'),
    body('description').optional().trim().isLength({ max: 255 }),
  ],
  validate,
  tx.createTransfer
);

module.exports = router;
