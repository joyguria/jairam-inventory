const express = require('express');
const router = express.Router();
const { getById, createAddress, updateAddress, deleteAddress } = require('../controllers/address.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/show/:id', getById);
router.post('/create', createAddress);
router.put('/update/:id', updateAddress);
router.delete('/delete/:id', deleteAddress);

module.exports = router;