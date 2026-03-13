const express = require('express');
const router = express.Router();
const User = require('../models/user');

const getAll = async (req, res) => {
    try {
        const arg = req.query.keyword;
        let query = {};

        // If a keyword exists, build the search filter
        if (arg && arg.trim() !== "") {
            query = {
                $or: [
                    { name: { $regex: arg, $options: 'i' } },
                    { email: { $regex: arg, $options: 'i' } }
                ]
            };
        }

        // Execute query with sorting
        const drivers = await User.find(query).sort({ createdAt: -1 });
        res.json(drivers);
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const getById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(201).json({ success: false, message: 'Driver not found' });
        res.json(driver);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}


module.exports = {
  getAll
};