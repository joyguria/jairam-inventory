const express = require('express');
const router = express.Router();
const { validateTank } = require('../validators/tank.validation');
const Tank = require('../models/tank');

// Example of an optimized Tank List aggregation
const getAllTankWithStock = async (req, res) => {

    const tanksWithStock = await Tank.aggregate([
      {
        $lookup: {
          from: 'purchases',
          localField: '_id',
          foreignField: 'tankId',
          as: 'purchases'
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'tankId',
          as: 'orders'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          capacity: 1,
          reservedStock: 1,
          location: 1,
          currentStock: { 
            $subtract: [
              { $sum: "$purchases.quantity" }, 
              { $sum: "$orders.quantity" }
            ] 
          }
        }
      }
    ]);
    return tanksWithStock;
}

// Get all tanks
const getAllTank = async (req, res) => {
    try {
        const arg = req.query.keyword;    
        let query = {};

        // If a keyword exists, build the search filter
        if (arg && arg.trim() !== "") {
            query = {
                $or: [
                    { name: { $regex: arg, $options: 'i' } },     // 'i' makes it case-insensitive
                    { landmark: { $regex: arg, $options: 'i' } },
                    { city: { $regex: arg, $options: 'i' } },
                    { state: { $regex: arg, $options: 'i' } },
                    { country: { $regex: arg, $options: 'i' } },
                    { code: { $regex: arg, $options: 'i' } }
                ]
            };
        }

        // Execute query with sorting
        const tanks = await Tank.find(query).sort({ createdAt: -1 });
        res.json(tanks);
        
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

// Get one tank
const getTankById = async (req, res) => {
    try {
        const tank = await Tank.findById(req.params.id);
        if (!tank) return res.status(404).json({ message: 'Tank not found' });
        res.json(tank);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

// Create a tank
const addTank = async (req, res) => {
    const { error, value} = validateTank(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message // Returns the first validation error
      });
    }
   
    const tank = new Tank({
        code: value.code,
        name: value.name,
        landmark: value.landmark,
        city: value.city,
        state: value.state,
        country: value.country,
        capacity: value.capacity,
        reservedStock: value.reservedStock,
        status: value.status
    });

    try {
        const newTank = await tank.save();
        if(newTank)
            res.status(200).json({success: true, message: 'Tank added successfully', newData: newTank});
        else
            res.status(201).json( {success: false, message: 'Unable to add!'});
    } catch (err) {
        res.status(201).json({ success: false, message: err.message });
    }
}

// Update a tank
const updateTank = async (req, res) => {
    try {

        const { error, value} = validateTank(req.body);
        if (error) {
          return res.status(201).json({ 
            status: 400,
            success: false, 
            message: error.details[0].message // Returns the first validation error
          });
        }
   

        const tank = await Tank.findById(req.params.id);
        if (!tank) return res.status(201).json({ status: 401, success: false, message: 'Tank not found' });

        tank.code = value.code;
        tank.name = value.name;
        tank.landmark = value.landmark;
        tank.city = value.city;
        tank.state = value.state;
        tank.country = value.country;
        tank.capacity = value.capacity;
        tank.reservedStock = value.reservedStock;
        tank.status = value.status;

        const updatedTank = await tank.save();
        if(updatedTank){
            res.status(200).json({ success: true, message: 'Tank updated successfully', updatedData: updatedTank });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

// Delete a tank
const deleteTank = async (req, res) => {
    try {
        await Tank.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Tank deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getAllTankWithStock,
    addTank,
    getAllTank,
    updateTank,
    deleteTank
};