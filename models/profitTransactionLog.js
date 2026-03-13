const mongoose = require('mongoose');
const profitTransactionLogSchema = new mongoose.Schema({
  runAt: { type: Date, required: true }, 
}, { timestamps: true });

const ProfitTransactionLog = mongoose.models.ProfitTransactionLog || mongoose.model('ProfitTransactionLog', profitTransactionLogSchema);
module.exports = ProfitTransactionLog;