const mongoose = require('mongoose');
// const Customer = require('../models/Customer');
const Customer = require('../models/customer');

const getCustomerStats = async (custID) => {
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(custID) } },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'customerId',
        as: 'orders'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creatorInfo'
      }
    }, {
      $unwind: { path: '$creatorInfo', preserveNullAndEmptyArrays: true }
    },
    {
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
        createdBy: '$creatorInfo.name',
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
    }
  ];

  const results = await Customer.aggregate(pipeline);
  return results[0] || null;
};

module.exports = { getCustomerStats };