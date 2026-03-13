const express = require('express');
const router = express.Router();
const { createOrder, getAll, getById, getByTank, updateOrderStatus, orderDelivered } = require('../controllers/order.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/all', getAll);
router.get('/:id', getById);
router.get('/tank/:id', getByTank);
router.post('/create', createOrder);
router.put('/update-status/:id', updateOrderStatus);
router.put('/delivery/:id', orderDelivered);
// router.put('/profile', authenticate, controller.updateUser);

module.exports = router;