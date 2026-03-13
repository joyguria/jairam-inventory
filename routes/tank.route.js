const express = require('express');
const router = express.Router();
const { getAllTankWithStock, addTank, getAllTank, updateTank, deleteTank } = require('../controllers/tank.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/tank-with-stock', getAllTankWithStock);
router.post('/create', addTank);
router.get('/all', getAllTank);
router.put('/update/:id', updateTank);
router.delete('/delete/:id', deleteTank);

// router.put('/profile', authenticate, controller.updateUser);
// router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;