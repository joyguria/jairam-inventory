 const mongoose = require('mongoose');

 const bankSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    holderName : {
        type : String,
        required:true
    },
    bankName : {
        type : String,
        required:true
    },
    accountNo : {
        type : String,
        required:true
    },
    branch : {
        type : String,
        required:true
    },
    ifscCode : {
        type : String,
        required:true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Bank', bankSchema);