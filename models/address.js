 const mongoose = require('mongoose');

 const addressSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adharNo : {
        type : String,
        required:true
    },
    panCardNo : {
        type : String,
        required:true
    },
    address : {
        type : String,
        required:true
    },
    city : {
        type : String,
        required:true
    },
    state : {
        type : String,
        required:true
    },
    country : {
        type : String,
        required:true
    },
    pinCode : {
        type : String,
        required:true
    },
    userType: {
        type: String,
        enum: ['Individual', 'Company'],
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);