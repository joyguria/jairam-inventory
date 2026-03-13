const mongoose = require('mongoose');
const { getDiscriminator } = require('./user');

const adminSchema = mongoose.Schema(
  {
    password: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

exports.AdminModal = getDiscriminator('Admin', adminSchema, 'admin');
exports.adminSchema = adminSchema;
