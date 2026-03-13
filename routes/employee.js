const express = require('express');
const bcrypt = require('bcrypt');
const Employee = require('../models/employee');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.password || !String(req.body.password).trim()) {
      return res.status(400).json({ message: 'Password is required for employee account' });
    }

    const hashedPassword = await bcrypt.hash(String(req.body.password).trim(), 10);
    const employee = new Employee({
      code: req.body.code,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      status: req.body.status,
      createdBy: req.body.createdBy,
    });

    const created = await employee.save();
    res.status(201).json(created);
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
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.body.code != null) employee.code = req.body.code;
    if (req.body.name != null) employee.name = req.body.name;
    if (req.body.email != null) employee.email = req.body.email;
    if (req.body.phone != null) employee.phone = req.body.phone;
    if (req.body.password != null && String(req.body.password).trim()) {
      employee.password = await bcrypt.hash(String(req.body.password).trim(), 10);
    }
    if (req.body.status != null) employee.status = req.body.status;
    if (req.body.createdBy != null) employee.createdBy = req.body.createdBy;

    const updated = await employee.save();
    res.json(updated);
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
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
