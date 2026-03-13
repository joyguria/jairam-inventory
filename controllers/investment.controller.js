
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { validateInvestment } = require('../validators/investment.validation');
const Investment = require('../models/investment');

const getAll = async (req, res) => {
    try {
        const arg = req.query.keyword;
        let query = {};

        // If a keyword exists, build the search filter
        if (arg && arg.trim() !== "") {
            query = {
                $or: [
                    { status: { $regex: arg, $options: 'i' } }
                ]
            };
        }

        // Execute query with sorting
        const investments = await Investment.find({}).populate('userId', 'name email').sort({ createdAt: -1 }).lean();      
        res.json(investments);        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}
const getOwn = async (req, res) => { 
    try {
         // const investorObjectId = new mongoose.Types.ObjectId(req.params.id);
         
        let query = { userId: req.params.id};


         
        // Execute query with sorting
        const investments = await Investment.find(query).sort({ createdAt: -1 });
        res.json(investments);
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}
const addInvestment = async (req, res) => {
    const { error, value} = validateInvestment(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message // Returns the first validation error
      });
    }
   
    const investment = new Investment({
        userId: value.userId,
        amount: value.amount,
        paymentMode: value.paymentMode,
        status: value.status
    });

    try {
        const newInvest = await investment.save();
        if(newInvest)
            res.status(200).json({success: true, message: 'Investment added successfully', newData: newInvest});
        else
            res.status(201).json( {success: false, message: 'Unable to add!'});
    } catch (err) {
        res.status(201).json({ success: false, message: err.message });
    }
}

// Update a tank
const updateInvestment = async (req, res) => {
    try {

        const { error, value} = validateInvestment(req.body);
        if (error) {
          return res.status(201).json({ 
            status: 400,
            success: false, 
            message: error.details[0].message
          });
        }
   
        const invest = await Investment.findById(req.params.id);
        if (!invest) return res.status(201).json({ status: 401, success: false, message: 'Investment not found' });

        invest.amount = value.amount;
        invest.profitPerLiterPerDay = value.profitPerLiterPerDay;
        invest.startDate = value.startDate;
        invest.endDate = value.endDate;
        invest.canWithdrawDate = value.canWithdrawDate;
        invest.approvedDate = value.approvedDate;
        invest.paymentMode = value.paymentMode;
        invest.status = value.status;
        invest.remarks = value.remarks;

        const updatedInvest = await invest.save();
        if(updatedInvest){
            res.status(200).json({ success: true, message: 'Investment updated successfully', updatedData: updatedInvest });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const updateInvestmentStatus = async (req, res) => {
    try {
        const { status } = req.body;        
   
        const invest = await Investment.findById(req.params.id);
        if (!invest) return res.status(201).json({ status: 401, success: false, message: 'Investment not found' });
        
        if(status == 'Running'){
            // if(invest.startDate === null && invest.endDate === null){            
                const currentDate = new Date();

                const tomorrowDate = new Date();
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);

                const nextYearDate = new Date();
                nextYearDate.setFullYear(tomorrowDate.getFullYear() + 1);

                invest.startDate = tomorrowDate;
                invest.endDate = nextYearDate;

                invest.approvedDate = currentDate;
            // }            
        }
        invest.status = status;
      
        const updatedInvest = await invest.save();
        if(updatedInvest){
            res.status(200).json({ success: true, message: 'Share amount assigned successfully', updatedData: updatedInvest });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const updateInvestmentShare = async (req, res) => {
    try {
        const { shareAmount } = req.body;        
   
        const invest = await Investment.findById(req.params.id);
        if (!invest) return res.status(201).json({ status: 401, success: false, message: 'Investment not found' });
        
        invest.profitPerLiterPerDay = shareAmount;     
      
        const updatedInvest = await invest.save();
        if(updatedInvest){
            res.status(200).json({ success: true, message: 'Share amount assigned successfully', updatedData: updatedInvest });
        }else{
            res.status(201).json({ success: false, message: 'Unable to update!!' });
        }
        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

// const deleteVehicle = async (req, res) => {
//     try {
//         await Vehicle.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: 'Vehicle deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// }

module.exports = {
  getAll,
  getOwn,
  addInvestment,
  updateInvestment,
  updateInvestmentStatus,
  updateInvestmentShare
};