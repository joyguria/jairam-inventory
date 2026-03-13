const express = require('express');
const router = express.Router();
const { addVehicle, getAll, updateVehicle, deleteVehicle } = require('../controllers/vehicle.controller.js');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected routes
router.post('/create', addVehicle);
router.get('/all', getAll);
router.put('/update/:id', updateVehicle);
router.delete('/delete/:id', deleteVehicle);

module.exports = router;