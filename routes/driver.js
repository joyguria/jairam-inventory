const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Driver = require('../models/driver');

router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.password || !String(req.body.password).trim()) {
      return res.status(400).json({ message: 'Password is required for driver account' });
    }

    const hashedPassword = await bcrypt.hash(String(req.body.password).trim(), 10);
    const driver = new Driver({
      code: req.body.code,
      drivingLicenceNo: req.body.drivingLicenceNo,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      status: req.body.status,
      createdBy: req.body.createdBy,
    });

    const newDriver = await driver.save();
    res.status(201).json(newDriver);
  } catch (err) {
    if (err?.code === 11000) {
      const duplicateKey = Object.keys(err?.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (req.body.code != null) driver.code = req.body.code;
    if (req.body.drivingLicenceNo != null) driver.drivingLicenceNo = req.body.drivingLicenceNo;
    if (req.body.name != null) driver.name = req.body.name;
    if (req.body.email != null) driver.email = req.body.email;
    if (req.body.phone != null) driver.phone = req.body.phone;
    if (req.body.password != null && String(req.body.password).trim()) {
      driver.password = await bcrypt.hash(String(req.body.password).trim(), 10);
    }
    if (req.body.status != null) driver.status = req.body.status;
    if (req.body.createdBy != null) driver.createdBy = req.body.createdBy;

    const updatedDriver = await driver.save();
    res.json(updatedDriver);
  } catch (err) {
    if (err?.code === 11000) {
      const duplicateKey = Object.keys(err?.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
