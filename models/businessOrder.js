const mongoose = require('mongoose');

const businessOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, trim: true },
    orderDate: { type: String, required: true, trim: true },
    deliveryDate: { type: String, default: '', trim: true },
    customerId: { type: String, default: '', trim: true },
    customerCode: { type: String, default: '', trim: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '', trim: true },
    customerAddress: { type: String, default: '', trim: true },
    productId: { type: String, default: '', trim: true },
    productCode: { type: String, default: '', trim: true },
    productName: { type: String, required: true, trim: true },
    tankId: { type: String, default: '', trim: true },
    tankCode: { type: String, default: '', trim: true },
    tankLocation: { type: String, default: '', trim: true },
    availableStockLitres: { type: Number, default: 0, min: 0 },
    quantityLitres: { type: Number, required: true, min: 0 },
    ratePerLitre: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    grossAmount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paymentTerms: { type: String, default: 'Credit', trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Dispatched', 'Completed', 'Cancelled', 'ConvertedToSale'],
      default: 'Pending',
    },
    assignedAgentId: { type: String, default: '', trim: true },
    assignedAgentName: { type: String, default: '', trim: true },
    remarks: { type: String, default: '', trim: true },
    saleId: { type: String, default: '', trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BusinessOrder || mongoose.model('BusinessOrder', businessOrderSchema);
