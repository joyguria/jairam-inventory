// const express = require('express');
// const router = express.Router();
// const { getOrderStatusStatsForAgentDashboard, closeTodayBusiness, getStatsForInvestorDashboard } = require('../controllers/dashboard.controller.js');
// const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
// router.get('/investor/:id', getStatsForInvestorDashboard);
// router.get('/agent/:id', getOrderStatusStatsForAgentDashboard);
// router.post('/close-today-business', closeTodayBusiness);


const express = require('express');
const router = express.Router();
const statsController = require('../controllers/dashboard.controller.js');
// const { verifyToken, isAdmin, isInvestor, isAgent } = require('../middleware/auth'); 

// Admin Dashboard
router.get('/admin/metrics', statsController.getStatsForAdminDashboard);

// Investor Dashboard
router.get('/investor/metrics/:id', statsController.getStatsForInvestorDashboard);

// Agent Dashboard (Note: passing the ID as a param)
router.get('/agent/metrics/:id', statsController.getOrderStatusStatsForAgentDashboard);

// Business Closure (Usually a button in Admin panel)
router.post('/admin/close-business', statsController.closeTodayBusiness);

module.exports = router;