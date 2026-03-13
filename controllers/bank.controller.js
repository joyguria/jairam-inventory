const express = require('express');
const router = express.Router();
const { validateBank } = require('../validators/bank.validation');
const Bank = require('../models/bank');

const getById = async (req, res) => {
  try {
    const bank = await Bank.findOne({userId:req.params.id});
    if (!bank) {
      return res.status(201).json({ success: false, message: "Bank not found" });
    }
    res.status(200).json({ success: true, bank: bank});
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
}

const createBank = async (req, res) => {
  const { error, value} = validateBank(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

  try {
    const newBank = new Bank(value);
    await newBank.save();
    res.status(201).json({ success: true, message: 'Bank added successfully', newData: newBank});
  } catch (err) {    
    res.status(201).json({ success: false, message: err.message });
  }
}

const updateBank = async (req, res) => {
  try {
    const { error, value} = validateBank(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      return res.status(201).json({ status: 404, success: false, message: 'Bank not found' });
    }
   
    bank.holderName = value.holderName;    
    bank.bankName = value.bankName;
    bank.accountNo = value.accountNo;
    bank.branch = value.branch;
    bank.ifscCode = value.ifscCode;
    bank.status = value.status;    

    const updated = await bank.save();
    res.status(200).json({ success: true, message: 'Details updated successfully', updatedData:updated });
  } catch (err) {
    res.status(201).json({ success: false, message: err.message });
  }
}

const deleteBank = async (req, res) => {
  try {
    await Bank.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Bank deleted' });
  } catch (err) {
    res.status(201).json({ status: false, message: err.message });
  }
}

module.exports = { getById, createBank, updateBank, deleteBank };
