const express = require('express');
const Investment = require('../models/investment');
const Purchase = require('../models/purchase');

const fundBalance = async () => {
  const credited = await Investment.aggregate([
    {
      $match: { status: 'Running' }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" }
      }
    }
  ]);
  // result will look like: [{ _id: null, totalAmount: 50000 }]
  const creditedAmount = credited.length > 0 ? credited[0].totalAmount : 0;

  //expensed amount
  const debited = await Purchase.aggregate([
    {
      // Use $in to match any status in the provided array
      $match: { 
        paymentStatus: { $in: ['Paid', 'Partial'] },
        purchaseStatus: { $in: ['Pending', 'Completed'] },
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$paidAmount" }
      }
    }
  ]);
  const debitedAmount = debited.length > 0 ? debited[0].totalAmount : 0;

  return (creditedAmount - debitedAmount);
}

module.exports = fundBalance;
