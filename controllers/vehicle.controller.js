

const express = require('express');
const router = express.Router();
const { validateVehicle } = require('../validators/vehicle.validation');
const Vehicle = require('../models/vehicle');

const getAll = async (req, res) => {
    try {
        const arg = req.query.keyword;
        let query = {};

        // If a keyword exists, build the search filter
        if (arg && arg.trim() !== "") {
            query = {
                $or: [
                    { vehicleNo: { $regex: arg, $options: 'i' } },     // 'i' makes it case-insensitive
                    { vehicleName: { $regex: arg, $options: 'i' } }
                ]
            };
        }

        // Execute query with sorting
        const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
        res.json(vehicles);
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const getById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(201).json({ success: false, message: 'Vehicle not found' });
        res.json(supplier);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const addVehicle = async (req, res) => {
    const { error, value} = validateVehicle(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message // Returns the first validation error
      });
    }
   
    const vehicle = new Vehicle({
        vehicleNo: value.vehicleNo,
        vehicleName: value.vehicleName,
        status: value.status,
        createdBy: value.createdBy
    });

    try {
        const newVehicle = await vehicle.save();
        if(newVehicle)
            res.status(200).json({success: true, message: 'Vehicle added successfully', newData: newVehicle});
        else
            res.status(201).json( {success: false, message: 'Unable to add!'});
    } catch (err) {
        res.status(201).json({ success: false, message: err.message });
    }
}

// Update a tank
const updateVehicle = async (req, res) => {
    try {

        const { error, value} = validateVehicle(req.body);
        if (error) {
          return res.status(201).json({ 
            status: 400,
            success: false, 
            message: error.details[0].message
          });
        }
   

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(201).json({ status: 401, success: false, message: 'Vehicle not found' });

        vehicle.vehicleNo = value.vehicleNo;
        vehicle.vehicleName = value.vehicleName;
        vehicle.createdBy = value.createdBy;        
        vehicle.status = value.status;

        const updatedVehicle = await vehicle.save();
        if(updatedVehicle){
            res.status(200).json({ success: true, message: 'Vehicle updated successfully', updatedData: updatedVehicle });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const deleteVehicle = async (req, res) => {
    try {
        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
  getAll,
  addVehicle,
  updateVehicle,
  deleteVehicle
};