const express = require('express');
const router = express.Router();
const { addSupplier, getAll, updateSupplier, deleteSupplier } = require('../controllers/supplier.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.post('/create', addSupplier);
router.get('/all', getAll);
router.put('/update/:id', updateSupplier);
router.delete('/delete/:id', deleteSupplier);

module.exports = router;