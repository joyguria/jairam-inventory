const mongoose = require('mongoose');

const investmentShareFundUsageSchema = new mongoose.Schema(
  {
    investmentShareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvestmentShare',
      required: true,
      index: true,
    },
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      default: null,
      index: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    entryType: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

investmentShareFundUsageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investmentShareFundUsageSchema.set('toJSON', { virtuals: true });

const InvestmentShareFundUsageModel =
  mongoose.models.InvestmentShareFundUsage ||
  mongoose.model('InvestmentShareFundUsage', investmentShareFundUsageSchema);

module.exports = {
  InvestmentShareFundUsageModel,
  investmentShareFundUsageSchema,
};
