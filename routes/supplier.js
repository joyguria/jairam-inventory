const express = require('express');
const router = express.Router();
const Supplier = require('../models/supplier');

router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const supplier = new Supplier({
    code: req.body.code,
    name: req.body.name,
    contactPerson: req.body.contactPerson,
    email: req.body.email,
    phone: req.body.phone,
    tinNo: req.body.tinNo,
    status: req.body.status,
  });

  try {
    const newSupplier = await supplier.save();
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (req.body.code != null) supplier.code = req.body.code;
    if (req.body.name != null) supplier.name = req.body.name;
    if (req.body.contactPerson != null) supplier.contactPerson = req.body.contactPerson;
    if (req.body.email != null) supplier.email = req.body.email;
    if (req.body.phone != null) supplier.phone = req.body.phone;
    if (req.body.tinNo != null) supplier.tinNo = req.body.tinNo;
    if (req.body.status != null) supplier.status = req.body.status;

    const updatedSupplier = await supplier.save();
    res.json(updatedSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
