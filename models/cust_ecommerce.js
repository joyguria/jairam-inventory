 const mongoose = require('mongoose');

 const customerSchema = mongoose.Schema({
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name : {
        type : String,
        required:true
    },
    phone : {
        type : String,
        required:true
    },
    
    email : {
        type : String,
        required:true,
        unique:true
    },
    password : {
        type : String,
        required:true
    },
    images : [
            {
            type : String
            }
        ]

 })

 // for creating virtual id in mongodb
 customerSchema.virtual('id').get(function (){
    return this._id.toHexString();
 })
 customerSchema.set('toJSON', {
    virtuals: true,
 })
 exports.CustomerModal = mongoose.model('Customer', customerSchema);
 exports.customerSchema = customerSchema;