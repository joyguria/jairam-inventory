const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    customerType: {
      type: String,
      enum: ['Retail', 'Wholesale', 'Industrial', 'General'],
      required: true,
      default: 'Retail',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    landmark : {
        type : String,
        required:true
    },
    city : {
        type : String,
        required:true
    },
    state : {
        type : String,
        required:true
    },
    country : {
        type : String,
        required:true
    },   
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('Customer', customerSchema);
