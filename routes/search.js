const {Product} = require('../models/products.js');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res)=>{
    try{
        const query = req.query.q;
        if(!query){
            return res.status(400).json({msg :" Query is required"});
        }
        const items = await Product.find({
            $or:[
                {name : {$regex : query, $options : 'i'}},
                {brand : {$regex : query, $options : 'i'}},
                //{subCat : {$regex : query, $options : 'i'}},
                {categoryName : {$regex : query, $options : 'i'}},
            ]
        });
        res.json(items)
    }catch(err){
        res.status(500).json({msg:"Server Error"})
    }
})

module.exports = router;