const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { validateOrder } = require('../validators/order.validation');
const Order = require('../models/order');
const Tank = require('../models/tank');
const { User } = require('../models/user');
const { OrderCounter } = require('../models/counter');
const { getCustomerStats } = require('../services/customer.service.js');
const PaymentTransaction = require('../models/paymentTransaction');
const CommissionTransaction = require('../models/commissionTransaction');

const getNextOrderNumber = async () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  const dateStr = `${year}${month}${day}`; // e.g., "260307"

  const lastOrder = await Order.findOne().select('orderNo').sort({ createdAt: -1 });

  if (lastOrder) {
    const parts = lastOrder.orderNo.split('-');     
    const nextNumber = parseInt(parts[2]) + 1;    
    // Put it back together
    const nextSequenceStr = nextNumber.toString().padStart(5, '0');
    return `JGO-${dateStr}-${nextSequenceStr}`;
  }else{
    return `JGO-${dateStr}-00001`;
  }  
}

const getAll = async (req, res) => {
    try {
      const { creator, status, keyword } = req.query;
      let query = {};

      // 1. Filter by Status
      if (status && status !== 'All') {
          query.orderStatus = status; 
      }

      // 2. Filter by Creator
      if (creator && creator !== 'All') {
          // Note: Ensure 'creator' is a valid hex string before casting
          query.createdBy = new mongoose.Types.ObjectId(creator);
      }

      // 3. Filter by Keyword (without overwriting)
      if (keyword && keyword.trim() !== "") {
          query.$or = [
              { orderNo: { $regex: keyword, $options: 'i' } } 
          ];
      }

      const result = await Order.find(query)
          .populate('customerId')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 });

      res.status(200).json(result);       
    } catch (err) {
        // Use 500 for actual errors
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
}

const getById = async (req, res) => {
    try {
        const fuelTransaction = await Order.findById(req.params.id);

        if (!fuelTransaction) return res.status(201).json({ success: false, message: 'Order not found' });

        res.json(fuelTransaction);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const getByTank = async (req, res) => {
    try {
        const fuelTransaction = await Order.findById(req.params.id);

        if (!fuelTransaction) return res.status(201).json({ success: false, message: 'Order not found' });

        res.json(fuelTransaction);
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const createOrder = async (req, res) => {
  try {  
    const { error, value} = validateOrder(req.body);   

    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }
    //generate order no automic
    value.orderNo = await getNextOrderNumber();

    const order = await Order.create({
      ...value
    });
    if(order){
        const updatedCustomer = await getCustomerStats(value.customerId);
        //
        if (order.paidAmount > 0) {
          await PaymentTransaction.create({
            referenceType: 'Order',
            referenceId: order._id,
            amount: order.paidAmount,
            paymentDate: order.createdAt,
            mode: order.paymentMode,
            notes: `Initial payment for Order #${order.orderNo}`
          });
        }
    
        res.status(200).json({
          success: true,
          message: 'Order added successfully',
          newData: order,
          customer: updatedCustomer
        });
    }
    else
      res.status(201).json({ success: false, message: 'Failed on process!'});

  } catch (err) {
    res.status(201).json({ success: false, message: err.message });
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    const { tankId, orderStatus } = req.body;
    const orderId = req.params.id;

    // 1. Fetch the order FIRST to check its current state
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 2. Prevent double stock subtraction
    let updatedTank = null;
    if (orderStatus === 'Confirmed' && order.orderStatus !== 'Confirmed') {
      if (!tankId) {
        return res.status(400).json({ success: false, message: "Tank ID required for confirmation" });
      }

      updatedTank = await Tank.findByIdAndUpdate(
        tankId,
        { $inc: { availableStock: -order.quantity } },
        { new: true }
      );
      
      if (!updatedTank) {
        return res.status(404).json({ success: false, message: "Tank not found" });
      }
      order.tankId = tankId;
    }

    // 3. Update the Order  
    order.orderStatus = orderStatus;
    
    // Optional: Update dates based on status
    if (orderStatus === 'Confirmed') order.confirmDate = new Date();
    if (orderStatus === 'Delivered') order.deliveryDate = new Date();
    if (orderStatus === 'Cancelled') order.cancelledDate = new Date();

    const orderUpdated = await order.save();

    if(orderUpdated){   
      //set commission to agent
      if (orderStatus !== 'Cancelled' && orderUpdated.paymentStatus !== 'Unpaid') {
        const paidAmount = orderUpdated.paidAmount || 0;

        if (paidAmount > 0) {
          const percentage = 3; //agent commission
                    
          // Calculate and round to 2 decimal places
          const commission = Number((paidAmount * percentage / 100).toFixed(2));

          const updatedUser = await User.findByIdAndUpdate(
            orderUpdated.createdBy,
            { $inc: { walletBalance: commission } },
            { new: true }
          );

          try {
            const newTransaction = new CommissionTransaction({
              userId: orderUpdated.createdBy, 
              orderId: orderUpdated._id,
              percentage: percentage, // Use the variable here!
              amount: commission,
              type: 'Credit',
              notes: `Sales commission (${percentage}%) for Order ${orderUpdated.orderNo}`
            });

            await newTransaction.save();  
          } catch (error) {           
            console.error('Commission Save Failed:', error.message);
          }
        }
      }
      // 4. Single Response Logic   
      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        updatedData: order,
        updatedTank: updatedTank
      });
    
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

const orderDelivered = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const orderId = req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    order.orderStatus = orderStatus;
    
    // Optional: Update dates based on status
    if (orderStatus === 'Confirmed') order.confirmDate = new Date();
    if (orderStatus === 'Delivered') order.deliveryDate = new Date();
    if (orderStatus === 'Cancelled') order.cancelledDate = new Date();

    const orderUpdated = await order.save();

    if(orderUpdated){
      return res.status(200).json({
        success: true,
        message: 'Order delivered successfully',
        updatedData: order
      });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


module.exports = { getAll, getById, getByTank, createOrder, updateOrderStatus, orderDelivered };
