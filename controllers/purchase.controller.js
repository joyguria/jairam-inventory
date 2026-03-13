const express = require('express');
const router = express.Router();
const { validatePurchase } = require('../validators/purchase.validation');
const Investment = require('../models/investment');
const Purchase = require('../models/purchase');
const Tank = require('../models/tank');
const Supplier = require('../models/supplier');
const StockTransaction = require('../models/stockTransaction');
const PaymentTransaction = require('../models/paymentTransaction');
const fundBalance = require('../services/fundBalanceService');

const getDropdownData = async(req, res) => {
  try {
    const [tanksData, suppliersData] = await Promise.all([
      Tank.find({}).select('_id name code'),
      Supplier.find({}).select('_id name code')
    ]);

    // OR map the data before sending
    const tanks = tanksData.map(tank => ({
      label: `${tank.name} - (${tank.code})`,
      value: tank._id
    }));

    const suppliers = suppliersData.map(supplier => ({
      label: `${supplier.name} - (${supplier.code})`,
      value: supplier._id
    }));

    const availableFund = await fundBalance();

    res.status(200).json({tanks, suppliers, 'availableFund':availableFund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAll = async (req, res) => {
    try {
        const result = await Purchase.find({}).sort({ createdAt: -1 });
        res.json(result);        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const getById = async (req, res) => {
    try {
        const fuelTransaction = await Purchase.findById(req.params.id);

        if (!fuelTransaction) return res.status(201).json({ success: false, message: 'Fuel Transaction not found' });

        res.json(fuelTransaction);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const getByTank = async (req, res) => {
    try {
        const purchases = await Purchase.find({ tankId: req.params.id}).populate('tankId', 'code name').sort({ createdAt: -1 });;

        if (!purchases) return res.status(201).json({ success: false, message: 'Purchase record not found' });

        res.json(purchases);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const createPurchase = async (req, res) => {
  try {

    const { error, value} = validatePurchase(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

    const tank = await Tank.findById(value.tankId, 'capacity pendingStock, availableStock');
    const tankSpace = (tank.capacity - (tank.pendingStock + tank.availableStock)); 
    if(value.quantity > tankSpace){
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: 'Insufficient space in tank!!'
      });
    }

    const balanceAmount = await fundBalance();    
    if(value.paidAmount > balanceAmount){
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: 'Insufficient fund in company balance!!'
      });
    }
  
    const purchase = await Purchase.create({
      ...value
    });
    if(purchase){  
      if (purchase && ['Pending', 'Completed'].includes(value.purchaseStatus)) {
        try {
          // Determine which field to target
          const updateField = value.purchaseStatus === 'Completed' ? 'availableStock' : 'pendingStock';

          // Perform the update in ONE step
          const updatedTank = await Tank.findByIdAndUpdate(
            value.tankId,
            { $inc: { [updateField]: Number(value.quantity) } }, 
            { new: true, runValidators: true } // Return updated doc and check schema rules
          );

          if (updatedTank) {
            // 3. Create the Stock Transaction
            // Logic: Only add to stock if the purchase is 'Completed'
            if (purchase.purchaseStatus === 'Completed') {
              await StockTransaction.create({
                tank: purchase.tankId,
                type: 'Purchase',
                quantity: purchase.quantity, // Positive inflow
                ratePerLitre: purchase.ratePerLitre,
                reference: {
                  model: 'Purchase',
                  id: purchase._id
                },
                date: purchase.receivedDate || Date.now(),
                notes: `Stock inflow from Purchase #${purchase.purchaseNo}`
              });
            }
            // 4. Create the Payment Transaction
            // Logic: Only create if an initial paidAmount was provided
            if (purchase.paidAmount > 0) {
              await PaymentTransaction.create({
                referenceType: 'Purchase',
                referenceId: purchase._id,
                amount: purchase.paidAmount,
                paymentDate: purchase.purchaseDate,
                mode: purchase.paymentMode,
                notes: `Initial payment for Purchase #${purchase.purchaseNo}`
              });
            }
            res.status(200).json({ success: true, message: 'Purchase added successfully', newData: purchase, updatedTank: updatedTank });
          }

          res.status(200).json({ success: true, message: 'Purchase added successfully', newData: purchase });

        } catch (error) {
          console.error("Stock update failed:", error);
        }
      }
    }
    else{
      res.status(201).json({ success: false, message: 'Failed on process!'});
    }

  } catch (err) {
    res.status(201).json({ success: false, message: err.message });
  }
};

const updatePurchaseStatus = async (req, res) => {
  try {
    const { purchaseStatus, receivedBy } = req.body; // Cleaner destructuring

    // 1. Update the Purchase and get the document back
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { purchaseStatus, receivedBy },
      { new: true, runValidators: true }
    );

    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    // 2. Prepare the Tank update logic
    let tankUpdate = {};
    if (purchaseStatus === 'Completed') {
      tankUpdate = { $inc: {
        pendingStock: -purchase.quantity, // Remove from pending
        availableStock: purchase.quantity  // Add to available
        } 
      };
    } else if (purchaseStatus === 'Cancelled') {
      tankUpdate = { $inc: { pendingStock: -purchase.quantity } }; // Use negative to subtract
    }

    // 3. Update the Tank ONLY if the status matches our conditions
    if (Object.keys(tankUpdate).length > 0) {
      const updatedTank = await Tank.findByIdAndUpdate(purchase.tankId, tankUpdate, { new: true });
      
      if(updatedTank){
        if (purchaseStatus === 'Completed') {
          await StockTransaction.create({
            tank: purchase.tankId,
            type: 'Purchase',
            quantity: purchase.quantity,
            ratePerLitre: purchase.ratePerLitre,
            reference: {
              model: 'Purchase',
              id: purchase._id
            },
            date: purchase.receivedDate || Date.now(),
            notes: `Stock inflow from Purchase #${purchase.purchaseNo}`
          });
        }
        res.status(200).json({ success: true, message: 'Purchase status updated successfully', updatedData: purchase, updatedTank: updatedTank });
      }else{
        return res.status(201).json({ success: false, message: "Tank not updated!" });
      }    
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getDropdownData, getAll, getById, getByTank, createPurchase, updatePurchaseStatus };
