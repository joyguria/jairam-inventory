const  {  CartModal } = require('../models/cart');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// signup route — corrected

router.post('/add', async (req, res) => {
  try {
    const { productTitle, image, rating, price, quantity, subTotal, productId, userId, vendorId } = req.body;
    
    // Check if this product is already in this user's cart
    const existingItem = await CartModal.findOne({ productId, userId });

    if (existingItem) {
      return res.status(409).json({
        status: false,
        msg: "Product already added in the cart",
      });
    }
      

    // Create new cart item
    const cartList = await CartModal.create({
      productTitle,
      image,
      rating,
      price,
      quantity,
      subTotal,
      productId,
      userId,
      vendorId
    });

    return res.status(201).json({
      status: true,
      cart: cartList,
    });

  } catch (error) {
    console.error("cart error:", error);
    return res.status(500).json({
      status: false,
      msg: "Something went wrong",
    });
  }
});





router.get('/', async (req, res)=>{
    try{
     const {userId} = req.query;  
      const cartList = await CartModal.find({userId});
            if(!cartList){
                res.status(500).json({
                    success:false
                })
                
            }
    res.send(cartList);

    }catch(error){
        res.status(500).json({success:false});
    }
})


/*
router.delete("/:productId", async (req, res) => {
 try{
       const cartItem  = await CartModal.findById(req.params.id);
        if(!cartItem){
            res.status(404).json({msg:"The cart item is given id is not found"})
        }

        const deleteItem = await CartModal.findByIdAndDelete(req.params.id);

     
        if(!deleteItem){
            return res.status(400).json(
                {
                    success: false,
                    msg:"The cart item not found"
                })
        }else{
            return res.status(200).json(
                {
                    success: true,
                    msg:" cart deleted successfully"
                })
        }

 }
    catch(error){
        return res.status(500).json({
            success:false,
            error:error
        })
     }
    
    
    
})
*/


router.delete("/:id", async (req, res) => {
  try {
    //const userId = req.query;  
    const { userId } = req.query;           // logged-in user
    const id = req.params.id;
     const deleteItem = await CartModal.findByIdAndDelete(req.params.id);
    

    res.json({ ok: true, message: "Item removed", deleteItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});



router.get('/get/count', async (req, res) => {
  try {
    const cartCount = await CartModal.countDocuments();

    res.status(200).json({
      success: true,
      cartCount: cartCount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.put('/:id', async (req, res) => {
    
    const cartList = await CartModal.findById(req.params.id,
        {
            productTitle:req.body.productTitle,
            image:req.body.image,
            rating:req.body.rating,
            price:req.body.price,
            quantity:req.body.quantity,
            subTotal:req.body.subTotal,
            productId:req.body.productId,
            userId:req.body.userId
        
        },
        {
            new:true
        }
    )
        
    if(!cartList){
        return res.status(400).json({msg:"cart item cant be updated"});
    }
    res.send(cartList);
       
});

module.exports =  router;