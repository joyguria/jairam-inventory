const  { AdminModal } = require('../models/admin');
const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isBcryptHash = (value = '') => /^\$2[aby]\$/.test(String(value));
const verifyPassword = async (plainPassword, storedPassword) => {
  const raw = String(plainPassword || '');
  const stored = String(storedPassword || '');
  if (!raw || !stored) return false;
  if (isBcryptHash(stored)) return bcrypt.compare(raw, stored);
  return raw === stored;
};
/*
router.post('/signup', async (req, res)=>{
    const {name, phone, email, password} = req.body;
    try{
        const existingUser = await AdminModal.findOne({email:email});
        if(!existingUser){
            res.status(400).json({msg: "User alraedy exist"})
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const result = await AdminModal.create({
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
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const emailRaw = String(req.body.email || '').trim();
  const email = emailRaw.toLowerCase();
  const password = String(req.body.password || '');

  // basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "name, email and password are required" });
  }

  try {
    // make sure we check existence correctly
    const existingUserEmail = await User.findOne({ email });
    const existingUserPhone = await User.findOne({ phone });
    if (existingUserEmail ) {
      return res.status(400).json({ status:false, msg: "User already exists" }); // <- return to stop execution
    }
    if (existingUserPhone ) {
      return res.status(400).json({ status:false, msg: "User already exists" }); // <- return to stop execution
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const result = await AdminModal.create({
      name,
      email,
      phone,
      password: hashPassword
    });

    // Token is optional for signup response; account creation should not fail because of env config.
    const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
    const token = secret
      ? jwt.sign(
          { email: result.email, id: result._id },
          secret,
          { expiresIn: '7d' }
        )
      : null;

    return res.status(201).json({
      user: result,
      token,
      msg: secret ? 'Admin created successfully' : 'Admin created successfully (token disabled: JWT secret not set)',
    });

  } catch (error) {
    console.error("Signup error:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }
    return res.status(500).json({ status:false, msg: "Something went wrong" });
  }
});


router.post('/signin', async (req, res)=>{
    const emailInput = String(req.body.email || '').trim();
    const email = emailInput.toLowerCase();
    const password = String(req.body.password || '').trim();

    try{
        if (!email || !password) {
            return res.status(400).json({ msg: "email and password are required" });
        }

        const emailRegex = new RegExp(`^${escapeRegExp(emailInput)}$`, 'i');

        let existingUser = await AdminModal.findOne({ email });
        if (!existingUser) {
            existingUser = await AdminModal.findOne({ email: emailRegex });
        }

        let legacyAdmin = null;
        if (!existingUser) {
            legacyAdmin = await User.db.collection('admins').findOne({
                $or: [{ email }, { email: emailRegex }],
            });
        }

        if(!existingUser && !legacyAdmin){
            return res.status(400).json({msg: "User Not Found"});
        }

        const storedPassword = existingUser?.password || legacyAdmin?.password;
        const matchPassword = await verifyPassword(password, storedPassword);
        if(!matchPassword){
            return res.status(400).json({msg: "Invalid Credential"});
        }

        const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
        if (!secret) {
            return res.status(500).json({ msg: "Server configuration error" });
        }

        const user = existingUser || legacyAdmin;
        const token = jwt.sign({email:user.email, id: user._id}, secret, { expiresIn: '7d' });
        return res.status(200).json({
            user,
            token:token,
            msg:"user authenticated"
        })



        
    }catch(error){
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});
    }

})

router.get('/', async (req, res)=>{
    const userList = await AdminModal.find();
    if(!userList){
        res.status(500).json({
            success:false
        })
        
    }
    res.send(userList);
})
/*
router.get('/:id', async (req, res)=>{
    const user = await AdminModal.findById(req.params.id);
    if(!user){
        res.status(500).json({
            msg:"The user with given ID is not found"
        })
        
    }
    res.status(200).send(user);
})*/
router.get('/:id', async (req, res) => {
    try {
        const user = await AdminModal.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                msg: "User with given ID was not found"
            });
        }

        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json({
            msg: "Server error",
            error: error.message
        });
    }
});


router.delete('/:id', async (req, res)=>{
     AdminModal.findByIdAndDelete(req.params.id).then(user =>{
        if(user){
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
    const userCount = await AdminModal.countDocuments();

    res.status(200).json({
      success: true,
      userCount: userCount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.put('/:id', async (req, res) => {
    const {name, phone, email, password} = req.body;
    const userExist = await AdminModal.findById(req.params.id);
    let newPassword;
    if(req.body.password){
        newPassword = bcrypt.hashSync(req.body.password, 10)
    }else{
        newPassword=userExist.password;
    }
    const user = await AdminModal.findByIdAndUpdate(req.params.id,
        {
            name:name,
            phone:phone,
            email:email,
            password:newPassword
        },
        {
            new:true
        }
    )
    if(!user)
        return res.status(400).send('the user cant be updated')
        res.send(user);
    
       
});
    

module.exports =  router;
