const mongoose = require('mongoose');

const tankSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    landmark: {
        type: String,
        required: true
    },    
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },   
    capacity: {
        type: Number,
        required: true
    },
    reservedStock: {
        type: Number,
        default: 0
    },
    pendingStock: {
        type: Number,
        default: 0
    },
    availableStock: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Maintenance'],
        default: 'Active'
    },
}, { timestamps: true });

module.exports = mongoose.models.Tank || mongoose.model('Tank', tankSchema);