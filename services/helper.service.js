const mongoose = require('mongoose');
const Order = require('../models/order');
const Investment = require('../models/investment');

const getTotalQuantityToday = async () => {
    // 1. Define the time boundaries for 'Today'
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    try {
        const result = await Order.aggregate([
            {
                // Stage 1: Filter for today's orders
                $match: {
                    orderStatus: "Delivered",
                    deliveryDate: {
                        $gte: startOfToday,
                        $lte: endOfToday
                    }
                }
            },
            {
                // Stage 2: Sum the quantity field
                $group: {
                    _id: null, // null means "group all matched documents into one"
                    totalQuantity: { $sum: "$quantity" }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalQuantity : 0;
    } catch (error) {
        console.error("Error calculating total:", error);
        throw error;
    }
}

const getActiveProfitSum = async (targetUserId) => {
    const today = new Date(); // Current date/time

    try {
        const result = await Investment.aggregate([
            {
                // Stage 1: Filter by User, Status, and Date Range
                $match: {
                    userId: new mongoose.Types.ObjectId(targetUserId),
                    status: "Running",
                    startDate: { $lte: today }, // startDate must be today or earlier
                    endDate: { $gte: today }    // endDate must be today or later
                }
            },
            {
                // Stage 2: Sum the profitPerLiterPerDay
                $group: {
                    _id: null,
                    totalProfitPerDay: { $sum: "$profitPerLiterPerDay" }
                }
            }
        ]);

        // Return the sum, or 0 if no matching records exist
        return result.length > 0 ? result[0].totalProfitPerDay : 0;
    } catch (error) {
        console.error("Error calculating profit sum:", error);
        throw error;
    }
};


module.exports = { getTotalQuantityToday, getActiveProfitSum };