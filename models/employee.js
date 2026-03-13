const mongoose = require('mongoose');
const { getDiscriminator } = require('./user');

const employeeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { _id: false }
);

module.exports = getDiscriminator('Employee', employeeSchema, 'employee');
