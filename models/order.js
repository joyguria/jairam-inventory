const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    tankId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tank',
        index: true,
        required: function() {
            return this.orderStatus === 'Confirmed';
        }
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true,
    },
    orderNo: { type: String, unique: true, required: true },
    quantity: { type: Number, required: true, min: 0 },
    ratePerLitre: { type: Number, required: true },
    freightCharges: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentMode: {
      type: String,
      enum: ['Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash', 'N/A'],
      required: false,
      default: ('N/A')
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Paid',
    },
    orderDate: {
        type: Date,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    // --- New Fields ---
    driver: { type: String, trim: true },
    vehicle: { type: String, trim: true },
    confirmDate: { type: Date },
    deliveryDate: { type: Date },
    cancelledDate: { type: Date },
    // ------------------
    remarks: { type: String, trim: true, default: '' },
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;