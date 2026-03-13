const express = require('express');
const router = express.Router();
const { getDropdownData, createPurchase, getAll, getById, getByTank, updatePurchaseStatus } = require('../controllers/purchase.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/dropdown', getDropdownData);
router.get('/all', getAll);
router.get('/:id', getById);
router.get('/tank/:id', getByTank);
router.post('/create', createPurchase);
router.put('/update-status/:id', updatePurchaseStatus);
// router.delete('/delete/:id', deletePurchase);
// router.put('/profile', authenticate, controller.updateUser);

module.exports = router;
