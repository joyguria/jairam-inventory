const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    deliveryNo: { type: String, required: true, unique: true, trim: true },
    saleId: { type: String, required: true, trim: true },
    saleNo: { type: String, default: '', trim: true },
    invoiceNo: { type: String, default: '', trim: true },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },
    deliveryAddress: { type: String, default: '', trim: true },
    productName: { type: String, default: '', trim: true },
    quantityLitres: { type: Number, default: 0, min: 0 },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverCode: { type: String, default: '', trim: true },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, default: '', trim: true },
    supportEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    supportEmployeeName: { type: String, default: '', trim: true },
    supportStatus: {
      type: String,
      enum: ['Unassigned', 'Assigned', 'In Progress', 'Completed'],
      default: 'Unassigned',
    },
    vehicleNo: { type: String, default: '', trim: true },
    assignedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Assigned', 'In Transit', 'Delivered', 'Cancelled'],
      default: 'Assigned',
    },
    alertSent: { type: Boolean, default: false },
    alertMessage: { type: String, default: '', trim: true },
    remarks: { type: String, default: '', trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
