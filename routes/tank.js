const express = require('express');
const router = express.Router();
const Tank = require('../models/tank');

// Get all tanks
router.get('/', async (req, res) => {
    try {
        const tanks = await Tank.find().sort({ createdAt: -1 });
        res.json(tanks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get one tank
router.get('/:id', async (req, res) => {
    try {
        const tank = await Tank.findById(req.params.id);
        if (!tank) return res.status(404).json({ message: 'Tank not found' });
        res.json(tank);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a tank
router.post('/', async (req, res) => {
    const tank = new Tank({
        code: req.body.code,
        location: req.body.location,
        capacity: req.body.capacity,
        reservedStock: req.body.reservedStock,
        status: req.body.status,
        currentStock: req.body.currentStock,
        availableStock: req.body.availableStock
    });

    try {
        const newTank = await tank.save();
        res.status(201).json(newTank);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a tank
router.put('/:id', async (req, res) => {
    try {
        const tank = await Tank.findById(req.params.id);
        if (!tank) return res.status(404).json({ message: 'Tank not found' });

        if (req.body.code != null) tank.code = req.body.code;
        if (req.body.location != null) tank.location = req.body.location;
        if (req.body.capacity != null) tank.capacity = req.body.capacity;
        if (req.body.reservedStock != null) tank.reservedStock = req.body.reservedStock;
        if (req.body.status != null) tank.status = req.body.status;
        if (req.body.currentStock != null) tank.currentStock = req.body.currentStock;
        if (req.body.availableStock != null) tank.availableStock = req.body.availableStock;

        const updatedTank = await tank.save();
        res.json(updatedTank);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a tank
router.delete('/:id', async (req, res) => {
    try {
        await Tank.findByIdAndDelete(req.params.id);
        res.json({ message: 'Tank deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;