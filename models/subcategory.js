 const mongoose = require('mongoose');

 const subcategorySchema = mongoose.Schema({
   
    
    category:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'Category',
            required: true
        } ,
    subCatName : {
        type : String,
        required:true
        }
 })

 // for creating virtual id in mongodb
 
 subcategorySchema.virtual('id').get(function (){
    return this._id.toHexString();
 })
 subcategorySchema.set('toJSON', {
    virtuals: true,
 }) 
 exports.Subcategory = mongoose.model('Subcategory', subcategorySchema);
 exports.subcategorySchema = subcategorySchema;