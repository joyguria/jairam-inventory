const {Category} = require('../models/category.js');
const {Subcategory} = require('../models/subcategory.js');
const {Product} = require('../models/products.js');
const {LastViewModel} = require('../models/lastviewedproducts.js')
const express = require('express');
const router = express.Router();
const dotenv = require('dotenv')
dotenv.config();
const cloudinary = require('cloudinary');
const pLimit = require('p-limit');

cloudinary.config({

    cloud_name : process.env.CLOUDINARY_NAME,
    api_key : process.env.CLOUDINARI_API_KEY,
    api_secret : process.env.CLOUDINARI_SECRETE_KEY
    //CLOUDINARY_URL: "cloudinary:613818513444238:MAE1Ydd9fIJ87f9d4Bgm70NPDx8@dwk0iqh83"
    
});


// get all the products details from last viewed table

router.get('/', async(req, res) =>{
            
            const page = parseInt(req.query.page) || 1;
            const perPage=15;
            const totalPosts = await LastViewModel.countDocuments();
            const totalPages = Math.ceil(totalPosts / perPage);
    
            if(page > totalPages){
                return res.status(404).json({message:"Page Not Found !"})
            }

            let productList=[];
            // fetching all products with category name
             
            
             productList = await LastViewModel.find().populate("category subCat")
             .sort({ dateCreated: -1 }) // Sort by creation date in descending order
             .limit(5)
            .skip((page - 1 ) * perPage)
            .limit(perPage)
            .exec();

            
           
    
    if(!productList){
        res.status(500).json({sucess : false})
    }
     return res.status(200).json({
            "productList":productList,
            "totalPages":totalPages,
            "page":page

         })
})
         

// insert products for last Viewd 
router.post('/create', async(req, res) =>{
     const limit = pLimit(3);
        const imagesToUpload = req.body.images.map((image)=>{
        return limit (async () => {
            const result = await cloudinary.uploader.upload(image, {
                public_id : 'skirt',
            }).catch((error) => {
           console.log("Step1 " + error);
       });
            console.log(`Successfully uploaded image ${image}`);
            return result;
             
        })
       
       
    });

    const uploadStatus = await Promise.all(imagesToUpload);
    const imgurl = uploadStatus.map((item)=>{
        return item.secure_url
    })
     
    if(!uploadStatus){
        return res.status(500).json({
            error:"Sadique...images cannot upload",
            status:false
        })
    }

console.log("step1", prodId);
let findProduct = await LastViewModel.find({prodId:req.body.prodId});
//let findProduct = await LastViewModel.findOne({ prodId });

console.log("find product--", findProduct.length);

var lastview;
if(findProduct.length===0){
     lastview = new LastViewModel({
        prodId:req.body.id,
        name: req.body.name,
        description: req.body.description,
        images: imgurl,
        brand: req.body.brand,
        price: req.body.price,
        discountPrice: req.body.discountPrice,
        categoryName:req.body.categoryName,
        subCategoryId:req.body.subCategoryId,
        category: req.body.category,
        subCat: req.body.subCat,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        isFeatured: req.body.isFeatured,
        discount: req.body.discount,
        productRAMS: req.body.productRAMS,
        productSIZE: req.body.productSIZE,
        productWEIGHT: req.body.productWEIGHT
    });
    
    lastview = await lastview.save();
    
    if(!lastview){
        res.status(500).json({
            error:err,
            success:false,

        })
    }

    res.status(201).json(lastview);
    
}

   
   
});









module.exports = router;