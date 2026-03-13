const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle');

router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const vehicle = new Vehicle({
    vehicleNo: req.body.vehicleNo,
    vehicleName: req.body.vehicleName,
    status: req.body.status,
    createdBy: req.body.createdBy,
  });

  try {
    const newVehicle = await vehicle.save();
    res.status(201).json(newVehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (req.body.vehicleNo != null) vehicle.vehicleNo = req.body.vehicleNo;
    if (req.body.vehicleName != null) vehicle.vehicleName = req.body.vehicleName;
    if (req.body.status != null) vehicle.status = req.body.status;
    if (req.body.createdBy != null) vehicle.createdBy = req.body.createdBy;

    const updatedVehicle = await vehicle.save();
    res.json(updatedVehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
