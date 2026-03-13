const mongoose = require('mongoose');

const investmentTransactionSchema = mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    duration: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMode: {
      type: String,
      enum: ['online', 'cash', 'cheque'],
      default: 'online',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

investmentTransactionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investmentTransactionSchema.set('toJSON', {
  virtuals: true,
});

exports.InvestmentTransactionModel =
  mongoose.models.InvestmentTransaction ||
  mongoose.model('InvestmentTransaction', investmentTransactionSchema);
exports.investmentTransactionSchema = investmentTransactionSchema;
