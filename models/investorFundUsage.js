const mongoose = require('mongoose');

const investorFundUsageSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      required: true,
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

investorFundUsageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investorFundUsageSchema.set('toJSON', { virtuals: true });

const InvestorFundUsageModel =
  mongoose.models.InvestorFundUsage || mongoose.model('InvestorFundUsage', investorFundUsageSchema);

module.exports = {
  InvestorFundUsageModel,
  investorFundUsageSchema,
};
