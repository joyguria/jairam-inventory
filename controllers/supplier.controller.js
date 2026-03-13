const express = require('express');
const router = express.Router();
const { validateSupplier } = require('../validators/supplier.validation');
const Supplier = require('../models/supplier');

// Get all tanks
const getAll = async (req, res) => {
    try {
        const arg = req.query.keyword;
        let query = {};

        // If a keyword exists, build the search filter
        if (arg && arg.trim() !== "") {
            query = {
                $or: [
                    { name: { $regex: arg, $options: 'i' } },     // 'i' makes it case-insensitive
                    { phone: { $regex: arg, $options: 'i' } },
                    { code: { $regex: arg, $options: 'i' } }
                ]
            };
        }

        // Execute query with sorting
        const suppliers = await Supplier.find(query).populate('createdBy', ['name']).sort({ createdAt: -1 });
        res.json(suppliers);
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

// Get one tank
const getById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(201).json({ success: false, message: 'Supplier not found' });
        res.json(supplier);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

// Create a tank
const addSupplier = async (req, res) => {
    const { error, value} = validateSupplier(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message // Returns the first validation error
      });
    }
   
    const supplier = new Supplier({
        createdBy: value.createdBy,
        code: value.code,
        name: value.name,
        contactPerson: value.contactPerson,
        email: value.email,
        phone: value.phone,
        tinNo: value.tinNo,
        status: value.status
    });

    try {
        const newSupplier = await supplier.save();
        if(newSupplier)
            res.status(200).json({success: true, message: 'Supplier added successfully', newData: newSupplier});
        else
            res.status(201).json( {success: false, message: 'Unable to add!'});
    } catch (err) {
        res.status(201).json({ success: false, message: err.message });
    }
}

// Update a tank
const updateSupplier = async (req, res) => {
    try {

        const { error, value} = validateSupplier(req.body);
        if (error) {
          return res.status(201).json({ 
            status: 400,
            success: false, 
            message: error.details[0].message
          });
        }
   

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(201).json({ status: 401, success: false, message: 'Supplier not found' });

        supplier.code = value.code;
        supplier.name = value.name;
        supplier.contactPerson = value.contactPerson;
        supplier.email = value.email;
        supplier.phone = value.phone;
        supplier.status = value.status;

        const updatedSupplier = await supplier.save();
        if(updatedSupplier){
            res.status(200).json({ success: true, message: 'Supplier updated successfully', updatedData: updatedSupplier });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

// Delete a tank
const deleteSupplier = async (req, res) => {
    try {
        await Supplier.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
  getAll,
  addSupplier,
  updateSupplier,
  deleteSupplier
};