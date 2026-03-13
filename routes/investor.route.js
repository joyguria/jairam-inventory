const express = require('express');
const router = express.Router();
const { dashboard } = require('../controllers/investor.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/dashboard/:id', dashboard);
// router.delete('/delete/:id', authenticate, deleteInvestor);

module.exports = router;