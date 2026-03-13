const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const Tank = require('../models/tank');
const Order = require('../models/order');
const Purchase = require('./models/Purchase'); // Ensure this path is correct
const Withdrawal = require('../models/withdrawal');
const Investment = require('../models/investment');
const CommissionTransaction = require('../models/commissionTransaction');
const ProfitTransaction = require('../models/profitTransaction');
const ProfitTransactionLog = require('../models/profitTransactionLog');
const { getTotalQuantityToday, getActiveProfitSum } = require('../services/helper.service');

// --- HELPER UTILITIES ---

const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// --- AGGREGATION HELPERS ---

const getQuantityStats = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await Order.aggregate([
        {
            $match: {
                deliveryDate: { $gte: sevenDaysAgo },
                orderStatus: 'Delivered'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveryDate" } },
                totalQuantity: { $sum: "$quantity" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);
};

const getSalesStats = async () => {
    const now = new Date();
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(now.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(now);
    endOfYesterday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumQuantity = async (startDate, endDate = new Date()) => {
        const result = await Order.aggregate([
            {
                $match: {
                    deliveryDate: { $gte: startDate, $lt: endDate },
                    orderStatus: 'Delivered'
                }
            },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);
        return result.length > 0 ? result[0].total : 0;
    };

    return {
        lastDay: await sumQuantity(startOfYesterday, endOfYesterday),
        thisWeek: await sumQuantity(startOfWeek),
        thisMonth: await sumQuantity(startOfMonth)
    };
};

// --- CONTROLLER FUNCTIONS ---

const getStatsForAdminDashboard = async (req, res) => {
    try {
        const { start, end } = getTodayRange();

        // 1. Parallel Data Fetching
        const [
            tanks,
            quantityStats,
            salesStats,
            investments,
            purchases,
            orders,
            withdrawals,
            todayInvest,
            todayPurch,
            todayOrd
        ] = await Promise.all([
            Tank.find({ status: 'Active' }).lean(),
            getQuantityStats(),
            getSalesStats(),
            // Total Investment
            Investment.aggregate([
                { $match: { status: { $in: ['Approved', 'Running', 'Completed', 'Withdraw'] } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Total Expenses (Purchase)
            Purchase.aggregate([
                { $match: { purchaseStatus: 'Completed', paymentStatus: { $in: ['Partial', 'Paid'] } } },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ]),
            // Total Earned (Orders)
            Order.aggregate([
                { $match: { paymentStatus: { $in: ['Partial', 'Paid'] }, orderStatus: { $in: ['Pending', 'Confirmed', 'Delivered'] } } },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ]),
            // Total Withdrawn
            Withdrawal.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Today's Investment
            Investment.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Today's Purchase Amount
            Purchase.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ]),
            // Today's Order Amount
            Order.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: { $in: ['Partial', 'Paid'] } } },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ])
        ]);

        const totalAvailableStock = tanks.reduce((sum, item) => sum + (item.availableStock || 0), 0);

        return res.status(200).json({
            success: true,
            metrics: {
                totalInvestment: investments[0]?.total || 0,
                totalExpenses: purchases[0]?.total || 0,
                totalEarned: orders[0]?.total || 0,
                totalWithdrawn: withdrawals[0]?.total || 0,
                availableStock: totalAvailableStock
            },
            todayReport: {
                investment: todayInvest[0]?.total || 0,
                purchaseAmount: todayPurch[0]?.total || 0,
                orderAmount: todayOrd[0]?.total || 0
            },
            quantityStats,
            salesStats
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getStatsForInvestorDashboard = async (req, res) => {
    try {
        const userId = req.user?._id || req.params.id; // Ensure userId is captured
        if (!userId) return res.status(400).json({ success: false, message: "User ID required" });

        const [quantityStats, salesStats, transactions, withdrawals, investments, user] = await Promise.all([
            getQuantityStats(),
            getSalesStats(),
            ProfitTransaction.find({ userId }).lean(),
            Withdrawal.find({ userId }).lean(),
            Investment.find({ userId }).lean(),
            User.findById(userId).select('policyStatus').lean()
        ]);

        const totalInvestment = investments.reduce((sum, item) => sum + (item.amount || 0), 0);
        const totalEarning = transactions.reduce((sum, item) => sum + (item.amount || 0), 0);

        let totalPending = 0;
        let totalWithdrawn = 0;

        withdrawals.forEach(w => {
            if (w.status === 'Pending') totalPending += w.amount;
            else if (w.status === 'Completed') totalWithdrawn += w.amount;
        });

        const currentWalletBalance = totalEarning - (totalPending + totalWithdrawn);

        return res.status(200).json({
            success: true,
            policyStatus: user?.policyStatus,
            metrics: {
                totalInvestment,
                totalEarning,
                totalPending,
                totalWithdrawn,
                walletBalance: currentWalletBalance
            },
            quantityStats,
            salesStats
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getOrderStatusStatsForAgentDashboard = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const [stats, transactions, withdrawals] = await Promise.all([
            Order.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
            ]),
            CommissionTransaction.find({ userId }).lean(),
            Withdrawal.find({ userId }).lean()
        ]);

        const formattedOrderStats = { Pending: 0, Confirmed: 0, Delivered: 0, Cancelled: 0 };
        stats.forEach(item => {
            if (item._id && formattedOrderStats.hasOwnProperty(item._id)) {
                formattedOrderStats[item._id] = item.count;
            }
        });

        const totalEarnings = transactions.reduce((sum, item) => sum + (item.amount || 0), 0);
        let totalPending = 0;
        let totalWithdrawn = 0;

        withdrawals.forEach(w => {
            if (w.status === 'Pending') totalPending += w.amount;
            else if (w.status === 'Completed') totalWithdrawn += w.amount;
        });

        res.status(200).json({
            success: true,
            metrics: {
                totalEarnings,
                totalPending,
                totalWithdrawn,
                walletBalance: totalEarnings - (totalPending + totalWithdrawn)
            },
            orderStats: formattedOrderStats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const closeTodayBusiness = async (req, res) => {
    try {
        const { start } = getTodayRange();

        const alreadyRun = await ProfitTransactionLog.findOne({ runAt: { $gte: start } });
        if (alreadyRun) {
            return res.status(400).json({ success: false, message: "Business already closed for today!" });
        }

        const users = await User.find({ role: 'Investor', status: 'Active' });
        const totalDiesel = await getTotalQuantityToday();
        const notes = "Daily Profit Distribution";

        const promises = users.map(async (usr) => {
            const ratePerLiter = await getActiveProfitSum(usr._id);
            const totalAmount = (totalDiesel * ratePerLiter);
            
            if (totalAmount > 0) {
                return new ProfitTransaction({
                    userId: usr._id,
                    soldQuantity: totalDiesel,
                    ratePerLiter,
                    amount: totalAmount,
                    type: 'Credit',
                    notes
                }).save();
            }
        });

        await Promise.all(promises);
        await new ProfitTransactionLog({ runAt: new Date() }).save();

        res.status(200).json({ success: true, message: 'Congratulations! Today business closed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getStatsForAdminDashboard,
    getStatsForInvestorDashboard,
    getOrderStatusStatsForAgentDashboard,
    closeTodayBusiness
};