const mongoose = require('mongoose');

const businessSaleSchema = new mongoose.Schema(
  {
    saleNo: { type: String, required: true, unique: true, trim: true },
    saleDate: { type: String, required: true, trim: true },
    invoiceNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: String, default: '', trim: true },
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
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Credit', 'Cheque'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid'],
      default: 'Paid',
    },
    receivedAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    deliveryAddress: { type: String, default: '', trim: true },
    vehicleNo: { type: String, default: '', trim: true },
    driverName: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Draft', 'Delivered', 'Cancelled', 'Invoiced'], default: 'Delivered' },
    remarks: { type: String, default: '', trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BusinessSale || mongoose.model('BusinessSale', businessSaleSchema);
