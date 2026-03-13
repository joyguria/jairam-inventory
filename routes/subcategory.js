const {Category} = require('../models/category.js');
const {Subcategory} = require('../models/subcategory.js');
const express = require('express');
const router = express.Router();
const dotenv = require('dotenv')
dotenv.config();
//const pLimit = require('p-limit').v2;





router.get('/', async(req, res) =>{
    try{
        const page = parseInt(req.query.page) || 1;
        const perPage=15;
        const totalPosts = await Subcategory.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if(page > totalPages){
            return res.status(404).json({message:"Page Not Found !"})
        }

        const subcategoryList = await Subcategory.find().populate("category")
        .skip((page - 1 ) * perPage)
        .limit(perPage)
        .exec();

         if(!subcategoryList){
            res.status(500).json({sucess : false})
         }
         return res.status(200).json({
            "subcategoryList":subcategoryList,
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
    const subcategory = await Subcategory.findById(req.params.id).populate("category");

    if(!subcategory){
        res.status(500).json({message : "The sub category with the given id was not found"})
    }
    return res.status(200).send(subcategory);
})

//Delete the category detail by id
router.delete('/:id', async(req, res) =>{
    const deleteSubcategory = await Subcategory.findByIdAndDelete(req.params.id);

    if(!deleteSubcategory){
        res.status(404).json({
            message : "The Subcategory not found", 
            success:"false"
        })
    }
     res.status(200).json({
        success:true,
        message:"Sub Category Deleted"
        
     });
})


// insert subcatergory into database
router.post('/create', async(req, res) =>{
    
    try{    
     const category = await Category.findById(req.body.category);
        if(!category){
            return res.status(404).send("Invalid Category");
        }   
        
    let subcategory = new Subcategory({
        
        category: req.body.category,
        subCatName:req.body.subCatName
        
    });
    

    if(!subcategory){
        res.status(500).json({
            error:err,
            success:false
        })
    }
    subcategory=await subcategory.save();
    res.status(201).json(subcategory);

    }catch(err){
            console.log("Data not Saved", err)
        }
});


// Update category
router.put('/:id', async(req, res) =>{

   try{    
     const subcategoryUpdate = await Subcategory.findByIdAndUpdate(
        req.params.id,
        {
            
            category: req.body.category,
            subCatName:req.body.subCatName
            
        },
        {
            new: true
        }
    );
    

    if(!subcategoryUpdate){
        res.status(500).json({
            message:"Sub Category cannot update",
            success:false
        })
    }
   
    res.send(subcategoryUpdate);

    }catch(err){
            console.log("Cannot update", err)
        }
})

module.exports =  router;
