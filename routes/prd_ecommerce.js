const {Category} = require('../models/category.js');
const {Subcategory} = require('../models/subcategory.js');
const {Product} = require('../models/prd_ecommerce.js');
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




//get the All Product details 
router.get('/', async(req, res) =>{
            
            const page = parseInt(req.query.page) || 1;
            const perPage=20;
            const totalPosts = await Product.countDocuments();
            const totalPages = Math.ceil(totalPosts / perPage);
            
    
            if(page > totalPages){
                return res.status(404).json({message:"Page Not Found !"})
            }

            let productList=[];
            // fetching all products with category name
            if(req.query.categoryName!==undefined){
                productList= await Product.find({categoryName:req.query.categoryName}).populate("category subCat");
            }
            // fetching all products with sub category id
            else if(req.query.subCategoryId!==undefined){
                productList= await Product.find({subCategoryId:req.query.subCategoryId}).populate("category subCat");
            }            
            else{
                 productList = await Product.find().populate("category subCat")
            .skip((page - 1 ) * perPage)
            .limit(perPage)
            .exec();

            }
            /*
            
            if(req.query.subCategoryId!==undefined){
                productList= await Product.find({subCategoryId:req.query.subCategoryId}).populate("category subCat");
            }else{
                 productList = await Product.find().populate("category subCat")
            .skip((page - 1 ) * perPage)
            .limit(perPage)
            .exec();

            } */
    
    if(!productList){
        res.status(500).json({sucess : false})
    }
     return res.status(200).json({
            "productList":productList,
            "totalPages":totalPages,
            "page":page

         })
})

// get all the product where isFeatured = true
router.get('/featured', async(req, res) =>{
    

        const productList = await Product.find({isFeatured:true})
        if(!productList){
            res.status(500).json({sucess : false})
        }
        return res.status(200).json(productList);

})
/*
router.get('/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const productList = await Product.find({ vendorId });

    if (productList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found for this vendor',
      });
    }

    return res.status(200).json(productList);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

*/
router.get('/:vendorId', async (req, res) => {

            const { vendorId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const perPage=20;
            const totalPosts = await Product.countDocuments();
            const totalPages = Math.ceil(totalPosts / perPage);
            
    
            if(page > totalPages){
                return res.status(404).json({message:"Page Not Found !"})
            }

            let productList=[];
            // fetching all products with category name
            if(req.query.categoryName!==undefined){
                productList= await Product.find({categoryName:req.query.categoryName}).populate("category subCat");
            }
            // fetching all products with sub category id
            else if(req.query.subCategoryId!==undefined){
                productList= await Product.find({subCategoryId:req.query.subCategoryId}).populate("category subCat");
            }            
            else{
                 productList = await Product.find({vendorId}).populate("category subCat")
            .skip((page - 1 ) * perPage)
            .limit(perPage)
            .exec();

            }
           
    
    if(!productList){
        res.status(500).json({sucess : false})
    }
     return res.status(200).json({
            "productList":productList,
            "totalPages":totalPages,
            "page":page

         })
})



//get the product detail by id
router.get('/product/:id', async (req, res) => {
    try {
        const product = await Product
            .findById(req.params.id)
            .populate("category subCat");

        if (!product) {
            return res.status(404).json({
                message: "The Product with the given id was not found"
            });
        }

        res.status(200).json(product);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



// insert product into database
router.post('/create', async(req, res) =>{

    try{    
        const category = await Category.findById(req.body.category);
        if(!category){
            return res.status(404).send("Invalid Category");
        }
        
         const subcategory = await Subcategory.findById(req.body.subCat);
         if(!subcategory){
            return res.status(404).send("Invalid Sub Category");
         } 
       
        

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

    

    let product = new Product({
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
        productWEIGHT: req.body.productWEIGHT,
        vendorId:req.body.vendorId

        
        
    });
    

    product = await product.save();
    if(!product){
        res.status(500).json({
            error:err,
            success:false,

        })
    }

    res.status(201).json(product);
    }catch(err){
            console.log("Cloadinary failed sadique", err)
        }
   
});

//Delete the product by id
router.delete('/:id', async(req, res) =>{
    const deleteProduct = await Product.findByIdAndDelete(req.params.id);

    if(!deleteProduct){
        res.status(404).json({
            message : "The Product not found", 
            success:"false"
        })
    }
     res.status(200).json({
        success:true,
        message:"Product Deleted"
        
     });
})


// Update category
router.put('/product/:id', async(req, res) =>{

   try{    
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
    

    

     const productUpdate = await Product.findByIdAndUpdate(
        req.params.id,
        {
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
        },
        {
            new: true
        }
    );
    

    if(!productUpdate){
        res.status(500).json({
            message:"Product cannot be updated",
            success:false
        })
    }
   
    res.send(productUpdate);

    }catch(err){
            console.log("Cloadinary failed sadique", err)
        }
})

//update stock when order place any product
router.put('/product/:productId/stock', async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        countInStock: { $gte: quantity } // prevents negative stock
      },
      {
        $inc: { countInStock: -quantity }
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(400).json({
        message: "Product not found or insufficient stock"
      });
    }

    res.status(200).json({
      message: "Stock updated successfully",
      countInStock: updatedProduct.countInStock
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;