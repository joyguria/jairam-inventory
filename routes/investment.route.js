const express = require('express');
const router = express.Router();
const { getAll, getOwn, addInvestment, updateInvestment, updateInvestmentStatus, updateInvestmentShare } = require('../controllers/investment.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/all', getAll);
router.get('/own/:id', getOwn);
router.post('/create', addInvestment);
router.put('/update/:id', updateInvestment);
router.put('/update-status/:id', updateInvestmentStatus);
router.put('/assign-share/:id', updateInvestmentShare);
// router.delete('/delete/:id', deleteInvestment);

module.exports = router;