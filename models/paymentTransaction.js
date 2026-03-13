const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    referenceType: { type: String, enum: ['Purchase', 'Order'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceType', required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    mode: { type: String, enum: ['Cash', 'NEFT', 'RTGS', 'Cheque', 'Online', 'UPI'], default: 'RTGS' },
    notes: String
}, { timestamps: true });

module.exports = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', paymentSchema);