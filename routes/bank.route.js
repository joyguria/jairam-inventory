const express = require('express');
const router = express.Router();
const { getById, createBank, updateBank, deleteBank } = require('../controllers/bank.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.post('/create', createBank);
router.get('/show/:id', getById);
router.put('/update/:id', updateBank);
router.delete('/delete/:id', deleteBank);

module.exports = router;