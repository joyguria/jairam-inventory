const mongoose = require('mongoose');

const investorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    investorCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    kycStatus: {
      type: String,
      default: 'Pending',
      trim: true,
    },
    bankStatus: {
      type: String,
      default: 'Pending',
      trim: true,
    },
    kycDetails: {
      adharNo: { type: String, default: '', trim: true },
      panCardNo: { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },      
      state: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      pinCode: { type: String, default: '', trim: true },
      investorType: {
        type: String,
        enum: ['company', 'individual'],
        default: 'individual',
      },
    },
    bankDetails: {
      holderName: { type: String, default: '', trim: true },
      bankName: { type: String, default: '', trim: true },
      accountNo: { type: String, default: '', trim: true },
      branch: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true },
    },
    policyStatus: {
      type: String,
      enum: ['Pending', 'Agree'],
      default: 'Pending',      
    },
    totalInvested: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

investorProfileSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

investorProfileSchema.set('toJSON', { virtuals: true });

const InvestorProfileModel = mongoose.models.InvestorProfile || mongoose.model('InvestorProfile', investorProfileSchema);

module.exports = {
  InvestorProfileModel,
  investorProfileSchema,
};
