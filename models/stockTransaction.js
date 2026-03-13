const mongoose = require('mongoose');
const stockTransactionSchema = new mongoose.Schema({
    tank: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    type: { type: String, enum: ['Purchase', 'Sale', 'Adjustment'], required: true },
    quantity: { type: Number, required: true }, // positive for inflow, negative for outflow
    ratePerLitre: { type: Number, required: true },
    reference: {
        model: { type: String, enum: ['Purchase', 'Order'] }, // which model this relates to
        id: { type: mongoose.Schema.Types.ObjectId, refPath: 'reference.model' }
    },
    date: { type: Date, default: Date.now },
    notes: { type: String }
}, { timestamps: true });
module.exports = mongoose.models.StockTransaction || mongoose.model('StockTransaction', stockTransactionSchema);