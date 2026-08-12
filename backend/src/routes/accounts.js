const express = require('express');
const { requireAuth } = require('../middleware/auth');
const accounts = require('../controllers/accountController');

const router = express.Router();

router.use(requireAuth); // every route below requires a valid access token

router.get('/', accounts.listMyAccounts);
router.get('/:id', accounts.getAccount);

module.exports = router;
