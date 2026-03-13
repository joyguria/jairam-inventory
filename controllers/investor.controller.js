
const mongoose = require('mongoose');
const { InvestorModal } = require('../models/investor');
const { User } = require('../models/user');
const { Counter } = require('../models/counter');
const { InvestorProfileModel } = require('../models/investorProfile');
const { InvestmentModel } = require('../models/investment');
const { InvestmentWalletModel } = require('../models/investmentWallet');
const { InvestmentShareModel } = require('../models/investmentShare');
const { InvestorFundUsageModel } = require('../models/investorFundUsage');
const { buildAccrualPatch } = require('../utils/investmentWalletAccrual');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const dashboard = async (req, res) => {
  try {
    const investorId = req.params.id;
   
    let policyStatus = 'Pending';

    const profile = await User.findOne({ _id: investorId }); 
    if(profile){
      policyStatus = profile.policyStatus ?? 'Pending';
    }
       
    const investorObjectId = new mongoose.Types.ObjectId(investorId);

    // 2. Run Aggregate
    const investment = await InvestmentModel.aggregate([
      {
        $match: {
          userId: investorObjectId,
          status: 'Running'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // const wallet = await InvestmentWalletModel.aggregate([
    //   {
    //     // 1. Filter the documents
    //     $match: {
    //       investorId: investorId,
    //       status: 'accepted'
    //     }
    //   },
    //   {
    //     // 2. Group and calculate multiple metrics
    //     $group: {
    //       _id: null,          

    //       // Total Profit (Total amount credited over time)
    //       totalProfit: { $sum: '$totalCreditedAmount' },

    //       // Total Withdrawn
    //       totalWithdrawn: { $sum: '$totalWithdrawnAmount' },

    //       // Net Balance: (Principal + Profits) - Withdrawals
    //       netBalance: { 
    //         $sum: { 
    //           $subtract: [
    //             { $add: ['$amount', '$totalCreditedAmount'] }, 
    //             '$totalWithdrawnAmount'
    //           ] 
    //         } 
    //       }
    //     }
    //   }
    // ]);

    const totalInvestedAmount = investment.length > 0 ? investment[0].totalAmount : 0;

    // Result handling
    const stats = {totalProfit: 0, totalWithdrawn: 0, netBalance: 0 };

    const summary = [
      { title: 'Investment', subtitle: 'Invested amount', value: totalInvestedAmount, progress: 60, theme: 'green', trend: 'up' },
      { title: 'Total Profit', subtitle: 'Total profit amount', value: stats.totalProfit, progress: 60, theme: 'orange', trend: 'up' },
      { title: 'Witdhdraw', subtitle: 'Total withdrawal amount', value: stats.totalWithdrawn, progress: 60, theme: 'blue', trend: 'up' },
      { title: 'Balance ', subtitle: 'Total Balance in wallet', value: stats.netBalance, progress: 60, theme: 'red', trend: 'down' }
    ];
   
    return res.status(200).json({ policyStatus, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { dashboard };