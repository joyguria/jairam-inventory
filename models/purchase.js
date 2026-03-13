const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    receivedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: function() { return this.status === 'Completed'; },
      default: null
    },   

    purchaseNo: { type: String, required: true },

    // --- Financials ---
    quantity: { type: Number, required: true, min: 0 },
    density: { type: Number, required: true, default: 0 },
    ratePerLitre: { type: Number, required: true },
    discountPercent: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    freightCharges: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },

    purchaseDate: {
      type: Date,
      required: false,
      default: Date.now
    }, 

    receivedDate: {
      type: Date,
      required: function() { return this.status === 'Completed'; },
      validate: {
        validator: function(value) {
          return !value || value >= this.purchaseDate;
        },
        message: 'Purchase date cannot be earlier than the purchase date.'
      }
    },

    paymentMode: {
      type: String,
      enum: ['Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash'],
      required: false
    },

    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partial', 'Paid'],
      default: 'Paid',
    },
    purchaseStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    remarks: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// Pre-save hook example to calculate totals automatically
purchaseSchema.pre('save', function(next) {
    // Basic calculation logic
    const basePrice = this.quantity * this.ratePerLitre;
    this.grossAmount = basePrice - this.discountAmount + this.freightCharges;
    this.taxAmount = (this.grossAmount * this.taxPercent) / 100;
    this.netAmount = this.grossAmount + this.taxAmount;
    next();
});

module.exports = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);