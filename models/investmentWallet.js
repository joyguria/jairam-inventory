const mongoose = require('mongoose');

const investmentWalletSchema = mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      required: true,
      index: true,
    },
    investmentShareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvestmentShare',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    accruedDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCreditedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    requestedWithdrawalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawnAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending_accept', 'accepted', 'withdraw_requested', 'admin_approved', 'transferred'],
      default: 'pending_accept',
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    adminApprovedAt: {
      type: Date,
      default: null,
    },
    withdrawalRequestedAt: {
      type: Date,
      default: null,
    },
    transferredAt: {
      type: Date,
      default: null,
    },
    lastAccruedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

investmentWalletSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investmentWalletSchema.set('toJSON', {
  virtuals: true,
});

exports.InvestmentWalletModel =
  mongoose.models.InvestmentWallet || mongoose.model('InvestmentWallet', investmentWalletSchema);
exports.investmentWalletSchema = investmentWalletSchema;
