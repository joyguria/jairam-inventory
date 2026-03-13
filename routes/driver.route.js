const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/driver.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.get('/all', getAll);

module.exports = router;