const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const Withdrawal = require('../models/withdrawal');
const CommissionTransaction = require('../models/commissionTransaction');
const ProfitTransaction = require('../models/profitTransaction');

const getAllWithdrawalRequest = async (req, res) => {
    try {
      const { status } = req.query;
      let query = {};

      // 1. Filter by Status
      if (status && status !== 'All') {
          query.status = status; 
      }
  
      const result = await Withdrawal.find(query)
          .populate('userId', ['_id', 'name', 'role'])
          .sort({ createdAt: -1 });

      res.status(200).json( { success: true, record: result });       
    } catch (err) {
        // Use 500 for actual errors
        res.status(201).json({ 
            success: false, 
            message: err.message 
        });
    }
}

const addWithdrawal = async (req, res) => {
  try {
    const { userId, amount, status, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(201).json({ status: 404, success: false, message: "User not found" });
    }

    // FIX 1: Use let for reassignment
    let transactions = [];
    if (user.role === 'Investor') {
      transactions = await ProfitTransaction.find({ userId }).lean();
    } else if (user.role === 'Agent') {
      transactions = await CommissionTransaction.find({ userId }).lean();
    }

    if (!transactions || transactions.length === 0) {
      return res.status(201).json({ success: false, message: "No earning history found!" });
    }

    const totalEarned = transactions.reduce((sum, item) => sum + (item.amount || 0), 0);

    const existingWithdrawals = await Withdrawal.find({ 
      userId, 
      status: { $ne: 'Rejected' } 
    }).lean();

    const totalWithdrawn = existingWithdrawals.reduce((sum, item) => sum + (item.amount || 0), 0);
    const availableBalance = totalEarned - totalWithdrawn;

    // FIX 2: Use 400 for validation errors
    if (availableBalance < amount) {
      return res.status(201).json({ 
        success: false, 
        message: `Insufficient balance! Available: ₹${availableBalance.toFixed(2)}` 
      });
    }

    const newWithdrawal = new Withdrawal({
      userId,
      amount,
      status: status || 'Pending',
      notes
    });

    await newWithdrawal.save();

    return res.status(201).json({ // 201 is correct here for successful creation
      success: true,
      message: 'Withdrawal request submitted',
      newData: newWithdrawal
    });

  } catch (err) {
    // FIX 3: Use 500 for server errors
    return res.status(201).json({ status: 500, success: false, message: err.message });
  }
};

// Update a tank
const updateWithdrawalStatus = async (req, res) => {
    try {       
      console.log(req.params.id);
      const withdrawal = await Withdrawal.findById(req.params.id);

      if (!withdrawal) return res.status(201).json({ status: 401, success: false, message: 'Withdrawal request not found' });
          
      withdrawal.status = req.body.status;

      const updatedWithdrawal = await withdrawal.save();

      if(updatedWithdrawal){
          res.status(200).json({ success: true, message: 'Withdrawal updated successfully', updatedData: updatedWithdrawal });
      }else{
          res.status(201).json({ success: false, message: 'Unable to update!!' });
      }        
    } catch (err) {
        res.status(201).json({ status: 500, success: false, message: err.message });
    }
}

const agentCommissionHistory = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // 1. Fetch Commissions and Withdrawals in parallel for better performance
    const [transactions, withdrawals] = await Promise.all([
      CommissionTransaction.find({ userId })
        .populate('orderId', ['orderNo', 'paidAmount'])
        .sort({ createdAt: -1 })
        .lean(),
      Withdrawal.find({ userId }).lean()
    ]);

    // 2. Calculate Total Earnings (Commissions)
    const totalEarnings = transactions.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 3. Calculate Withdrawal Metrics
    let totalPending = 0;
    let totalWithdrawn = 0;

    withdrawals.forEach(w => {
      if (w.status === 'Pending') {
        totalPending += w.amount;
      } else if (w.status === 'Completed') {
        totalWithdrawn += w.amount;
      }
      // Note: 'Rejected' is ignored as it doesn't affect balance
      // 'Approved' is usually treated as pending until 'Completed'
    });

    // 4. Calculate Final Wallet Balance
    // Formula: Total Earned - (Everything already taken out or currently locked in request)
    const currentWalletBalance = totalEarnings - (totalPending + totalWithdrawn);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      metrics: {
        totalEarnings,       // Total ever earned
        totalPending,        // 1. Total Pending amount
        totalWithdrawn,      // 2. Total Withdrawal (Completed)
        walletBalance: currentWalletBalance // 3. Current available balance
      },
      earnings: transactions,
      withdrawals: withdrawals
    });

  } catch (error) {
    console.error("Commission History Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const investorDailyProfitHistory = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // 1. Fetch Commissions and Withdrawals in parallel for better performance
    const [transactions, withdrawals] = await Promise.all([
      ProfitTransaction.find({ userId })        
        .sort({ createdAt: -1 })
        .lean(),
      Withdrawal.find({ userId }).lean()
    ]);

    // 2. Calculate Total Earnings (Commissions)
    const totalEarnings = transactions.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 3. Calculate Withdrawal Metrics
    let totalPending = 0;
    let totalWithdrawn = 0;

    withdrawals.forEach(w => {
      if (w.status === 'Pending') {
        totalPending += w.amount;
      } else if (w.status === 'Completed') {
        totalWithdrawn += w.amount;
      }
    });

    // 4. Calculate Final Wallet Balance
    // Formula: Total Earned - (Everything already taken out or currently locked in request)
    const currentWalletBalance = totalEarnings - (totalPending + totalWithdrawn);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      metrics: {
        totalEarnings,       // Total ever earned
        totalPending,        // 1. Total Pending amount
        totalWithdrawn,      // 2. Total Withdrawal (Completed)
        walletBalance: currentWalletBalance // 3. Current available balance
      },
      earnings: transactions,
      withdrawals: withdrawals
    });

  } catch (error) {
    console.error("Daily Profit History Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  addWithdrawal,
  updateWithdrawalStatus,
  getAllWithdrawalRequest,
  agentCommissionHistory,
  investorDailyProfitHistory
};