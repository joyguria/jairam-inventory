const mongoose = require('mongoose');

const investmentShareSchema = mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      required: true,
      index: true,
    },
    investmentCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    shareType: {
      type: String,
      required: true,
      enum: ['percentage', 'per_litre'],
    },
    share: {
      type: Number,
      required: true,
      min: 0,
    },
    dieselPerLitre: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLitre: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInvestmentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    profitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyProfitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    walletActivationTime: {
      type: String,
      default: '00:00',
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

investmentShareSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investmentShareSchema.set('toJSON', {
  virtuals: true,
});

exports.InvestmentShareModel =
  mongoose.models.InvestmentShare || mongoose.model('InvestmentShare', investmentShareSchema);
exports.investmentShareSchema = investmentShareSchema;
