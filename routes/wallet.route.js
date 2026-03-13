const express = require('express');
const router = express.Router();
const { addWithdrawal, updateWithdrawalStatus, getAllWithdrawalRequest, agentCommissionHistory, investorDailyProfitHistory } = require('../controllers/wallet.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.post('/withdrawal/create', addWithdrawal);
router.get('/withdrawal-request', getAllWithdrawalRequest);
router.put('/update-withdrawal-request/:id', updateWithdrawalStatus);
router.get('/commission/history/:id', agentCommissionHistory);
router.get('/profit/history/:id', investorDailyProfitHistory);
module.exports = router;
