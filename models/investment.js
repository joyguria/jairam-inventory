const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    amount: { type: Number, required: true },
 
    profitPerLiterPerDay: {
      type: Number,
      required: false,
      default: 0,
    },

    startDate: { type: Date, required: false, default: null },
    endDate: { type: Date, required: false, default: null }, 
    
    canWithdrawDate: { type: Date, required: false, default: null },
    approvedDate: { type: Date, required: false, default: null }, 

    totalProfitEarned: { type: Number, default: 0 },
    
    paymentMode: {
      type: String,
      enum: ['Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash'],
      required: true
    },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Running', 'Completed', 'Withdraw', 'Freeze'],
      default: 'Pending',
    },

    remarks: {
      type: String,
      required: false,
      default: ''
    }
  },
  { timestamps: true }
);
// module.exports = mongoose.models.Investment || mongoose.model('Investment', investmentSchema);

const Investment = mongoose.models.Investment || mongoose.model('Investment', investmentSchema);

module.exports = Investment;


