 const mongoose = require('mongoose');

 const lastviewedproductSchema = mongoose.Schema({
    prodId:{
        type:String,
        default:''
    },
    name:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    images:[
        {
            type:String,
            required:true
        }
    ],
    brand:{
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true,
        default:0
    },
    discountPrice:{
        type: Number,
        default:0
    },
    categoryName:{
        type: String,
        default:''
    },
    subCategoryId:{
        type: String,
        default:''
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required: true
    },
    subCat:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Subcategory',
        required: true
    },
    
    countInStock:{
        type: Number,
        required: true
    },
    rating:{
        type: Number,
        default: 0
    },
    isFeatured:{
        type: Boolean,
        default: false
    },
    discount:{
        type:Number,
        required:true
    },
    productRAMS:[
        {
            type:String
        }
    ],
     productSIZE:[
        {
            type:String
        }
    ],
    productWEIGHT:[
        {
            type:String
        }
    ],
    dateCreated:{
        type: Date,
        default: Date.now
    },

 })

 // for creating virtual id in mongodb
  lastviewedproductSchema.virtual('id').get(function (){
     return this._id.toHexString();
  })
  lastviewedproductSchema.set('toJSON', {
     virtuals: true,
  })

exports.LastViewModel = mongoose.model('LastView', lastviewedproductSchema);
exports.lastviewedproductSchema = lastviewedproductSchema;