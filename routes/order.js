const  {  OrderModal } = require('../models/order');
const express = require('express');
const router = express.Router();

// signup route — corrected

router.post('/add', async (req, res) => {
  try {
    //const { productTitle, image, rating, price, quantity, subTotal, productId, userId } = req.body;
   
    let order = new OrderModal({
      name:req.body.name,
      phoneNumber:req.body.phoneNumber,
      address:req.body.address,
      pincode:req.body.pincode,
      amount:req.body.amount,
      paymentId:req.body.paymentId,
      email:req.body.email,
      userId:req.body.userId,
      products:req.body.products,
      
    });
    order = await order.save();
    res.status(201).json(order);

  } catch (error) {
    console.error("cart error:", error);
    return res.status(500).json({
      status: false,
      msg: "Something went wrong",
    });
  }
});

//fetching order details user wise
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const perPage = 10;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const totalPosts = await OrderModal.countDocuments({ userId });
    const totalPages = Math.ceil(totalPosts / perPage);

    if (totalPosts === 0) {
      return res.status(200).json({
        orderList: [],
        totalPages: 0,
        page: 1,
      });
    }

    if (page > totalPages) {
      return res.status(404).json({ message: "Page Not Found!" });
    }

    const orderList = await OrderModal.find({ userId })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 }) // optional but recommended
      .exec();

    return res.status(200).json({
      orderList,
      totalPages,
      page,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

//fetching order details Vendor wise
router.get('/vendor/:vendorId/products', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const orders = await OrderModal.aggregate([
      // 1️⃣ Match orders that contain this vendor
      {
        $match: {
          products: {
            $elemMatch: { vendorId }
          }
        }
      },

      // 2️⃣ Unwind products array
      { $unwind: "$products" },

      // 3️⃣ Keep only this vendor's products
      {
        $match: {
          "products.vendorId": vendorId
        }
      },

      // 4️⃣ Group by paymentId
      {
        $group: {
          _id: "$paymentId",              // GROUP BY paymentId
          paymentId: { $first: "$paymentId" },
          orderId: { $first: "$_id" },
          name: { $first: "$name" },
          phoneNumber: { $first: "$phoneNumber" },
          address: { $first: "$address" },
          pincode: { $first: "$pincode" },
          amount: { $first: "$amount" },
          status: { $first: "$status" },
          createdAt: { $first: "$createdAt" },

          // Collect vendor products
          products: { $push: "$products" }
        }
      },

      // 5️⃣ Sort latest payments first
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json(orders);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// fetch all the order details for products by PaymentId(admin section)
router.get('/vendor/:vendorId/payment/:paymentId', async (req, res) => {
  try {
    const { vendorId, paymentId } = req.params;

    const orders = await OrderModal.aggregate([
      // 1️⃣ Match order by paymentId (CORRECT)
      {
        $match: { paymentId: paymentId }
      },

      // 2️⃣ Unwind products
      { $unwind: "$products" },

      // 3️⃣ Keep only vendor products
      {
        $match: {
          "products.vendorId": vendorId
        }
      },

      // 4️⃣ Group back
      {
        $group: {
          _id: "$_id",                 // Mongo Order ID
          paymentId: { $first: "$paymentId" },
          name: { $first: "$name" },
          phoneNumber: { $first: "$phoneNumber" },
          address: { $first: "$address" },
          status: { $first: "$status" },
          createdAt: { $first: "$createdAt" },
          products: { $push: "$products" }
        }
      }
    ]);

    res.status(200).json(orders[0] || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// fetch all the order details for products by vendor(admin section)
// GET /api/orders/vendor/:vendorId
router.get('/vendor/:vendorId', async (req, res) => {
    try {
        // This finds every order where AT LEAST ONE product has the matching vendorId
        const vendorOrders = await OrderModal.find({
            "products.vendorId": req.params.vendorId
        });

        if (!vendorOrders) {
            return res.status(404).json({ message: "No orders found for this vendor" });
        }

        res.status(200).json(vendorOrders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});







/*
router.get('/', async(req, res) =>{
    try{
        const page = parseInt(req.query.page) || 1;
        const perPage=10;
        const totalPosts = await OrderModal.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);
        const {userId} = req.query;

        if(page > totalPages){
            return res.status(404).json({message:"Page Not Found !"})
        }

        const orderList = await OrderModal.find({userId})
        .skip((page - 1 ) * perPage)
        .limit(perPage)
        .exec();

         if(!orderList){
            res.status(500).json({sucess : false})
         }
         return res.status(200).json({
            "orderList":orderList,
            "totalPages":totalPages,
            "page":page

         })
        //res.send(catregoryList);
    }catch(error){
        console.log(error);
    }
})
*/
router.get('/:id', async(req, res) =>{
    const order = await OrderModal.findById(req.params.id);

    if(!order){
        res.status(500).json({message : "The order with the given id was not found"})
    }
    return res.status(200).send(order);
})

router.delete('/:id', async(req, res) =>{
    const deleteOrder = await OrderModal.findByIdAndDelete(req.params.id);

    if(!deleteOrder){
        res.status(404).json({
            message : "The order not found", 
            success:"false"
        })
    }
     res.status(200).json({
        success:true,
        message:"Order Deleted"
        
     });
})

router.put('/:orderId', async (req, res) => {
  try {
    const order = await OrderModal.findByIdAndUpdate(
      req.params.orderId,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.log("Cannot update", err);
    res.status(500).json({ message: "Server error" });
  }
});





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
*/

  


module.exports =  router;