 const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { validateCustomer } = require('../validators/customer.validation');
const Customer = require('../models/customer');
const { getCustomerStats } = require('../services/customer.service.js');

/*
const getAll =  async (req, res) => {
  try {
    const arg = req.query.keyword;
    let query = {};

    if (arg && arg.trim() !== "") {
        query = {
            $or: [
                { name: { $regex: arg, $options: 'i' } },
                { phone: { $regex: arg, $options: 'i' } },
                { email: { $regex: arg, $options: 'i' } },
                { landmark: { $regex: arg, $options: 'i' } },
                { city: { $regex: arg, $options: 'i' } },
                { state: { $regex: arg, $options: 'i' } }
            ]
        };
    }
 
    const customers = await Customer.find(query).populate('createdBy', ['name']).sort({ createdAt: -1 });
    console.log(customers);
    res.status(200).json(customers);
  } catch (err) {
    res.status(201).json({ status: 500, success: false, message: err.message });
  }
}
*/

const getNextCustomerNumber = async () => {
  const lastCode = await Customer.findOne().select('code').sort({ createdAt: -1 });

  if (lastCode) {

    // Regex to capture letters ([A-Z]+) and digits (\d+)
    const match = (lastCode.code).match(/^([a-zA-Z]+)(\d+)$/);
    
    if (!match) return lastCode.code;

    const prefix = match[1];      // "JGC"
    const numericStr = match[2];  // "00004"
    
    // Increment and preserve the length with leading zeros
    const nextNumber = parseInt(numericStr, 10) + 1;
    const newNumericStr = nextNumber.toString().padStart(numericStr.length, '0');
    return `${prefix}${newNumericStr}`;   
  }else{
    return `JGC00001`;
  }  
}

const getAll = async (req, res) => {
  try {
    const arg = req.query.keyword;
    const creator = req.query.creator;
    
    const pipeline = [];
    // Changed to 'let' so we can modify/reassign if needed
    let filter = {};

    // Fixed 'created' to 'creator'
    if (creator && creator !== "All") {
      filter.createdBy = new mongoose.Types.ObjectId(creator);
    }

    // 1. SEARCH STAGE
    if (arg && arg.trim() !== "") {
      filter.$or = [
        { name: { $regex: arg, $options: 'i' } },
        { phone: { $regex: arg, $options: 'i' } },
        { email: { $regex: arg, $options: 'i' } },
        { landmark: { $regex: arg, $options: 'i' } },
        { city: { $regex: arg, $options: 'i' } },
        { state: { $regex: arg, $options: 'i' } },
        { code: { $regex: arg, $options: 'i' } }
      ];
    }

    pipeline.push({ $match: filter });

    // 2. JOIN ORDERS
    pipeline.push({
      $lookup: {
        from: 'orders', 
        localField: '_id',
        foreignField: 'customerId',
        as: 'orders'
      }
    });

    // 3. JOIN CREATOR
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creatorInfo'
      }
    }, {
      $unwind: { path: '$creatorInfo', preserveNullAndEmptyArrays: true }
    });

    // 4. PROJECT & CALCULATE
    pipeline.push({
      $project: {
        name: 1,
        code: 1,
        customerType: 1,
        phone: 1,
        email: 1,
        landmark: 1,
        city: 1,
        state: 1,
        country: 1,
        status: 1,
        createdAt: 1,
        createdBy: { $ifNull: ['$creatorInfo.name', 'Unknown'] }, 
        totalOrders: { $size: '$orders' },
        totalOrderValue: { $sum: '$orders.netAmount' },
        totalPendingOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.orderStatus', 'Pending'] }
            }
          }
        }
      }
    });

    // 5. SORT
    pipeline.push({ $sort: { createdAt: -1 } });

    const customers = await Customer.aggregate(pipeline);

    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

const getById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(201).json({ status: 401, success: false, message: 'Customer not found' });
    }
    res.status(200).json(customer);
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
}

const saveCustomer = async (req, res) => {
  const { error, value} = validateCustomer(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

  try {
    value.code = await getNextCustomerNumber();
    const savedCustomer = await Customer.create(value);
    const customerWithStats = await getCustomerStats(savedCustomer._id);

    res.status(201).json({ success: true, message: 'Customer added successfully', newData: customerWithStats});
  } catch (err) {
    if (err.code === 11000) {
      return res.status(201).json({ success: false, message: err.message });
    }
    res.status(201).json({ success: false, message: err.message });
  }
}

const updateCustomer = async (req, res) => {
  try {
    const { error, value} = validateCustomer(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(201).json({ status: 404, success: false, message: 'Customer not found' });
    }

    customer.name = value.name;
    customer.customerType = value.customerType;
    customer.email = value.email;
    customer.phone = value.phone;
    customer.landmark = value.landmark;
    customer.city = value.city;
    customer.state = value.state;
    customer.country = value.country;
    customer.status = value.status;

    const updatedCustomer = await customer.save();
    res.status(200).json({ success: true, message: 'Details updated successfully', updatedData:updatedCustomer });
  } catch (err) {
    res.status(201).json({ success: false, message: err.message });
  }
}

const deleteCustomer = async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(201).json({ status: false, message: err.message });
  }
}

module.exports = { getAll, getById, saveCustomer, updateCustomer, deleteCustomer };
