const express = require('express');
const router = express.Router();
const { validateAddress } = require('../validators/address.validation');
const Address = require('../models/address');

const getById = async (req, res) => {
  try {
    const address = await Address.findOne({userId:req.params.id});
    if (!address) {
      return res.status(201).json({ success: false, message: "Address not found" });
    }
    res.status(200).json({ success: true, kyc: address});
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
}

const createAddress = async (req, res) => {
  const { error, value} = validateAddress(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

  try {
    const newAddress = new Address(value);
    await newAddress.save();    
    res.status(201).json({ success: true, message: 'Address added successfully', newData: newAddress});
  } catch (err) {    
    res.status(201).json({ success: false, message: err.message });
  }
}

const updateAddress = async (req, res) => {
  try {
    const { error, value} = validateAddress(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(201).json({ status: 404, success: false, message: 'Address not found' });
    }
   
    address.adharNo = value.adharNo;
    address.panCarNo = value.panCarNo;
    address.address = value.address;
    address.city = value.city;
    address.state = value.state;    
    address.country = value.country;
    address.pinCode = value.pinCode;
    address.userType = value.userType;
    address.status = value.status;

    const updated = await address.save();
    res.status(200).json({ success: true, message: 'Details updated successfully', updatedData:updated });
  } catch (err) {
    res.status(201).json({ success: false, message: err.message });
  }
}

const deleteAddress = async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Address deleted' });
  } catch (err) {
    res.status(201).json({ status: false, message: err.message });
  }
}

module.exports = { getById, createAddress, updateAddress, deleteAddress };
