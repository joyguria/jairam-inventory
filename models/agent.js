const mongoose = require('mongoose');
const { getDiscriminator } = require('./user');

const agentSchema = new mongoose.Schema(
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

module.exports = getDiscriminator('Agent', agentSchema, 'agent');
