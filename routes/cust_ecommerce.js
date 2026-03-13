const  { CustomerModal } = require('../models/cust_ecommerce');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
dotenv.config();
//const pLimit = require('p-limit').v2;
const cloudinary = require('cloudinary');
const pLimit = require('p-limit');

/*
router.post('/signup', async (req, res)=>{
    const {name, phone, email, password} = req.body;
    try{
        const existingUser = await UserModal.findOne({email:email});
        if(!existingUser){
            res.status(400).json({msg: "User alraedy exist"})
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const result = await UserModal.create({
            name:name,
            email:email,
            phone:phone,
            password:hashPassword
        });

        const token = jwt.sign({email:result.email, id: result._id}, process.env.JSON_WEB_TOKEN_SECRETE_KET);
        res.status(200).json({
            user:result,
            token:token
        })

    }catch(error){
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});

    }
})
*/
// signup route — corrected
router.post('/signup', async (req, res) => {
  const { name, phone, email, password } = req.body;

  // basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "name, email and password are required" });
  }

  try {
    // image upload code for customer profile image
   


    // make sure we check existence correctly
    const existingUserEmail = await CustomerModal.findOne({ email });
    const existingUserPhone = await CustomerModal.findOne({ phone });
    if (existingUserEmail ) {
      return res.status(400).json({ status:false, msg: "User already exists" }); // <- return to stop execution
    }
    if (existingUserPhone ) {
      return res.status(400).json({ status:false, msg: "User already exists" }); // <- return to stop execution
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const result = await CustomerModal.create({
      name,
      email,
      phone,
      password: hashPassword
    });

    // use a clear env var name; change if your env var is different
    const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
    if (!secret) {
      console.error("JWT secret not configured in env (JWT_SECRET)");
      return res.status(500).json({ msg: "Server configuration error" });
    }

    const token = jwt.sign(
      { email: result.email, id: result._id },
      secret,
      { expiresIn: '7d' } // optional: set token expiry
    );

    return res.status(201).json({ customer: result, token });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ status:false, msg: "Something went wrong" });
  }
});


router.post('/signin', async (req, res)=>{
    const {email, password} = req.body;

    try{

        


        const existingUser = await CustomerModal.findOne({email:email});
        if(!existingUser){
            res.status(400).json({msg: "User Not Found"});
        }
        
        const matchPassword = await bcrypt.compare(password, existingUser.password);
        if(!matchPassword){
            res.status(400).json({msg: "Invalid Credential"});
        }
            

        const token = jwt.sign({email:existingUser.email, id: existingUser._id}, process.env.JSON_WEB_TOKEN_SECRETE_KET);
        res.status(200).json({
            user:existingUser,
            token:token,
            msg:"user authenticated"
        })



        
    }catch(error){
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});
    }

})

router.put('/changePassword/:id', async (req, res) => {
  try {
    const { name, phone, email, password, newPas } = req.body;

    // Find user by ID
    const existingUser = await CustomerModal.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: true, msg: "Customer Not Found" });
    }

    // Verify current password
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(400).json({ msg: "Current Password is Wrong" });
    }

    // Hash new password if provided
    let updatedPassword = existingUser.password;
    if (newPas) {
      updatedPassword = await bcrypt.hash(newPas, 10);
    }

    // Update customer
    const customer = await CustomerModal.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        email,
        password: updatedPassword,
      },
      { new: true }
    );

    if (!customer) {
      return res.status(400).json({ msg: "User cannot be updated" });
    }

    res.json({
      success: true,
      msg: "Password updated successfully",
      customer,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, msg: "Server Error" });
  }
});




router.get('/', async (req, res)=>{
    const customerList = await CustomerModal.find();
    if(!customerList){
        res.status(500).json({
            success:false
        })
        
    }
    res.send(customerList);
})
/*
router.get('/:id', async (req, res)=>{
    const user = await UserModal.findById(req.params.id);
    if(!user){
        res.status(500).json({
            msg:"The user with given ID is not found"
        })
        
    }
    res.status(200).send(user);
})*/
router.get('/:id', async (req, res) => {
    try {
        const customer = await CustomerModal.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                msg: "Customer with given ID was not found"
            });
        }

        return res.status(200).json(customer);

    } catch (error) {
        return res.status(500).json({
            msg: "Server error",
            error: error.message
        });
    }
});


router.delete('/:id', async (req, res)=>{
     CustomerModal.findByIdAndDelete(req.params.id).then(customer =>{
        if(customer){
            return res.status(200).json(
                {
                    success: true,
                    msg:"The user is deleted"
                })
        }else{
            return res.status(404).json(
                {
                    success: false,
                    msg:" User not found"
                })


        }
     }).catch(error=>{
        return res.status(500).json({
            success:false,
            error:error
        })
     })
    
    
    
})

router.get('/get/count', async (req, res) => {
  try {
    const customerCount = await CustomerModal.countDocuments();

    res.status(200).json({
      success: true,
      customerCount: customerCount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.put('/:id', async (req, res) => {
    
    
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
    
    
    
    const {name, phone, email} = req.body;
    const customerExist = await CustomerModal.findById(req.params.id);
    let newPassword;
    if(req.body.password){
        newPassword = bcrypt.hashSync(req.body.password, 10)
    }else{
        newPassword=customerExist.passwordHash;
    }
    const customer = await CustomerModal.findByIdAndUpdate(req.params.id,
        {
            name:name,
            phone:phone,
            email:email,
           // password:newPassword,
            images:imgurl,

        },
        {
            new:true
        }
    )
    if(!customer)
        return res.status(400).send('the user cant be updated')
        res.send(customer);
    
       
});
    

module.exports =  router;