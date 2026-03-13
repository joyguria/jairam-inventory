const mongoose = require('mongoose');
const profitTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  soldQuantity: { type: Number, required: true },
  ratePerLiter: { type: Number, required: true },  
  amount: { type: Number, required: true },
  type: { type: String, default: 'Credit' }, // Credit/Debit
  notes: String,
}, { timestamps: true });

const ProfitTransaction = mongoose.models.ProfitTransaction || mongoose.model('ProfitTransaction', profitTransactionSchema);
module.exports = ProfitTransaction;