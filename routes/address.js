const {AddressModal} = require('../models/address.js');
const express = require('express');
const router = express.Router();


// insert address into database
router.post('/add', async (req, res) => {
  try {
    const {
      fullName,
      country,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      customerId,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID required",
      });
    }

    // 🔍 Check if address already exists
    const existingAddress = await AddressModal.findOne({ customerId });

    if (existingAddress) {
      return res.status(409).json({
        success: false,
        message: "Address already exists for this customer",
        address: existingAddress,
      });
    }

    // ➕ Save new address
    const address = await AddressModal.create({
      fullName,
      country,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      customerId,
    });

    res.status(201).json({
      success: true,
      message: "Address saved successfully",
      address,
    });

  } catch (error) {
    console.error("address error:", error);

    // Handle duplicate key error (DB-level safety)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Address already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});




//get the category detail by id
router.get('/:customerId', async (req, res) => {
  try {
    const address = await AddressModal.findOne({
      customerId: req.params.customerId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    res.status(200).json(address);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
});





// fetch all deatils
router.get('/', async(req, res) =>{
    try{
        const page = parseInt(req.query.page) || 1;
        const perPage=10;
        const totalPosts = await Category.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if(page > totalPages){
            return res.status(404).json({message:"Page Not Found !"})
        }

        const categoryList = await Category.find()
        .skip((page - 1 ) * perPage)
        .limit(perPage)
        .exec();

         if(!categoryList){
            res.status(500).json({sucess : false})
         }
         return res.status(200).json({
            "categoryList":categoryList,
            "totalPages":totalPages,
            "page":page

         })
        //res.send(catregoryList);
    }catch(error){
        console.log(error);
    }
})



//Delete the category detail by id
router.delete('/:id', async(req, res) =>{
    const deleteCategory = await Category.findByIdAndDelete(req.params.id);

    if(!deleteCategory){
        res.status(404).json({
            message : "The category not found", 
            success:"false"
        })
    }
     res.status(200).json({
        success:true,
        message:"Category Deleted"
        
     });
})



// Update category
router.put('/:id', async(req, res) =>{

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
    


     const categoryUpdate = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name:req.body.name,
            images:imgurl,
            color:req.body.color
        },
        {
            new: true
        }
    );
    

    if(!categoryUpdate){
        res.status(500).json({
            message:"Category cannot update",
            success:false
        })
    }
   
    res.send(categoryUpdate);

    }catch(err){
            console.log("Cloadinary failed sadique", err)
        }
})

module.exports =  router;
