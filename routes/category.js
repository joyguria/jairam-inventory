const {Category} = require('../models/category.js');
const express = require('express');
const router = express.Router();
const dotenv = require('dotenv')
dotenv.config();
//const pLimit = require('p-limit').v2;
const cloudinary = require('cloudinary');
const pLimit = require('p-limit');

cloudinary.config({

    cloud_name : process.env.CLOUDINARY_NAME,
    api_key : process.env.CLOUDINARI_API_KEY,
    api_secret : process.env.CLOUDINARI_SECRETE_KEY
    //CLOUDINARY_URL: "cloudinary:613818513444238:MAE1Ydd9fIJ87f9d4Bgm70NPDx8@dwk0iqh83"
    
});



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


//get the category detail by id
router.get('/:id', async(req, res) =>{
    const category = await Category.findById(req.params.id);

    if(!category){
        res.status(500).json({message : "The category with the given id was not found"})
    }
    return res.status(200).send(category);
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


// insert catergory into database
router.post('/create', async(req, res) =>{
    
    try{    
        cloudinary.config({
            cloud_name : process.env.CLOUDINARY_NAME,
            api_key : process.env.CLOUDINARI_API_KEY,
            api_secret : process.env.CLOUDINARI_SECRETE_KEY
         //CLOUDINARY_URL: "cloudinary:613818513444238:MAE1Ydd9fIJ87f9d4Bgm70NPDx8@dwk0iqh83"
    
        });
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
    

    let category = new Category({
        name:req.body.name,
        images:imgurl,
        color:req.body.color
    });
    

    if(!category){
        res.status(500).json({
            error:err,
            success:false
        })
    }
    category=await category.save();
    res.status(201).json(category);

    }catch(err){
            console.log("Cloadinary failed sadique", err)
        }
});


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
