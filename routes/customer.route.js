const express = require('express');
const router = express.Router();
const { getAll, saveCustomer, updateCustomer, deleteCustomer } = require('../controllers/customer.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.post('/create', saveCustomer);
router.get('/all', getAll);
router.put('/update/:id', updateCustomer);
router.delete('/delete/:id', deleteCustomer);

module.exports = router;