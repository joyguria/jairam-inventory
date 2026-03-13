 const mongoose = require('mongoose');

 const cartSchema = mongoose.Schema({
    productTitle : {
        type : String,
        required:true
    },
    
    image: {
        type : String,
        required:true
        },
    
    rating : {
        type : Number,
        required:true
    },
    price : {
        type : Number,
        required:true
    },
    quantity : {
        type : Number,
        required:true
    },
    subTotal : {
        type : Number,
        required:true
    },
    productId : {
        type : String,
        required:true
    },
    userId : {
        type : String,
        required:true
    },
    vendorId:{
        type:String,
        required:true
    }

 })

 // for creating virtual id in mongodb
 cartSchema.virtual('id').get(function (){
    return this._id.toHexString();
 })
 cartSchema.set('toJSON', {
    virtuals: true,
 })
 exports.CartModal = mongoose.model('Cart', cartSchema);
 exports.cartSchema = cartSchema;