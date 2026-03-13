 const mongoose = require('mongoose');
const commissionTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  percentage: { type: Number, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Credit', 'Debit'], default: 'Credit' }, // Credit/Debit
  notes: String,
}, { timestamps: true });

module.exports = mongoose.models.CommissionTransaction || mongoose.model('CommissionTransaction', commissionTransactionSchema);