 const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Counter } = require('../models/counter');
const { User } = require('../models/user');
const { InvestorProfileModel } = require('../models/investorProfile');
const { signinValidation, signupValidation } = require('../validators/user.validation');
// const PaymentTransaction = require('../models/PaymentTransaction');
const transporter = require('../utils/mailer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require('fs');
const path = require('path');

const allowedRoles = ['admin', 'super_admin', 'investor', 'driver', 'agent', 'employee'];

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const getNextInvestorCode = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'investorCode',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const code = `JRG${String(counter.seq).padStart(4, '0')}`;
    const existsInUser = await User.exists({ investorCode: code });
    const existsInProfile = await InvestorProfileModel.exists({ investorCode: code });
    if (!existsInUser && !existsInProfile) return code;
  }
  throw new Error('Unable to generate unique investor code');
};

const sendVerifyEmail = async (userData) => {

  const filePath = path.join(__dirname, '../mail/verify.html');
  const source = fs.readFileSync(filePath, 'utf-8').toString();

  // 3. Compile the template with Handlebars
  const template = handlebars.compile(source);
  
  // 4. Inject your dynamic data
  const replacements = {
    name: userData.name,
    email: userData.email,   
    company: 'JaiRam Group',
    otp: userData.otp,
    date: new Date().toLocaleDateString()
  };
  const htmlToSend = template(replacements);

  const mailOptions = {
    from: '"JaiRam Group Support" <info@sacoder.com>',
    to: userData.email,
    subject: "Welcome to the JaiRam Group!",
    html: htmlToSend // Pass the compiled HTML here
  };

  return await transporter.sendMail(mailOptions);
} 

const sendGreetingEmail = async (userData) => {  
  // 2. Read the HTML file
  const filePath = path.join(__dirname, '../mail/greeting.html');
  const source = fs.readFileSync(filePath, 'utf-8').toString();

  // 3. Compile the template with Handlebars
  const template = handlebars.compile(source);
  
  // 4. Inject your dynamic data
  const replacements = {
    name: userData.name,
    email: userData.email,
    password: userData.password,
    company: 'JaiRam Group',
    date: new Date().toLocaleDateString()
  };
  const htmlToSend = template(replacements);

  //generate pdf
  try {
    const data = {
      name: "Joy Guria",
      investment: 100000,
      profit: 12000,
      transactions: [
        { date: "01-01-2026", amount: 5000 },
        { date: "10-01-2026", amount: 7000 },
      ],
    };

    // 1️⃣ Render HTML with data
    const html = await ejs.renderFile(
      path.join(__dirname, "../mail/policy.ejs"),
      data
    );
    // 2️⃣ Launch browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);    
    // 3️⃣ Generate PDF buffer
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    // 4️⃣ Send email   
    const mailOptions = {
    from: '"JaiRam Group Support" <info@sacoder.com>',
    to: userData.email,
    subject: "Welcome to the JaiRam Group!",
    html: htmlToSend, // Pass the compiled HTML here
      attachments: [
          {
            filename: "policy.pdf",
            content: pdfBuffer,
          },
        ],
    };

    return await transporter.sendMail(mailOptions);

  }catch(err){}
  //end
}

const signIn = async (req, res) => {
  try {
    const { error, value} = signinValidation(req.body);
    if (error) {
      return res.status(201).json({ 
        status: 400,
        success: false, 
        message: error.details[0].message // Returns the first validation error
      });
    }

    const { email, password } = value;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ status: 401, success: false, message: 'Invalid credentials' });
    }
    if(!user.emailVerified){
      return res.status(201).json({ status: 401, success: false, message: 'Email is not verified' });
    }
    if(!user.status === 'Pending'){
      return res.status(201).json({ status: 401, success: false, message: 'Your account is pending!!' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(201).json({ status: 401, success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    return res.status(201).json({ status: 500, success: false, message: error.message });
  }
};

const signUp = async (req, res) => {
  try {

    const { error, value } = signupValidation(req.body);

    if (error) {
      return res.status(200).json({
        status: 400,
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, phone, password, role, createdBy, policyStatus, status } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.status === 'Pending') {
        await User.deleteOne({ _id: existingUser._id });    
      } else {
        return res.status(409).json({
          success: false, 
          message: 'Email is already registered and active.' 
        });
      }
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ status: 401, success: false, message: 'Phone already registered' });
    }
    
    const otp = crypto.randomInt(100000, 999999).toString();

    const payload = {
      role,
      name,
      email,
      phone,
      password: password ? await bcrypt.hash(password, 10) : '',
      otpCode: otp,
      status: status,
      createdBy: createdBy,
      policyStatus
    };

    // if (role === 'investor') {
    //   payload.gender = req.body.gender || 'male';
    //   payload.investorCode = await getNextInvestorCode();
    //   payload.policyStatus = "Pending";
    // }  

    const created = await User.create(payload);
    if(created){       
      const data = {
        name: name,  
        email: email,   
        otp: otp,
        company: 'JaiRam Group'
      }
      sendVerifyEmail(data);
    }
   
    res.status(201).json({ success: true, id: created._id});
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateKey = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(201).json({ status: 409, success:false , message: `${duplicateKey} already exists` });
    }
    res.status(201).json({ status: 400, success: false, message: error.message });
  }
}

const signUpDirect = async (req, res) => {
  try {
    const { error, value } = signupValidation(req.body);

    if (error) {
      return res.status(200).json({
        status: 400,
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, phone, password, role, createdBy, policyStatus, status } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.status === 'Pending') {
        await User.deleteOne({ _id: existingUser._id });    
      } else {
        return res.status(409).json({
          success: false, 
          message: 'Email is already registered and active.' 
        });
      }
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ status: 401, success: false, message: 'Phone already registered' });
    }
   
    const payload = {
      role,
      name,
      email,
      emailVerified: true,
      phone,
      password: password ? await bcrypt.hash(password, 10) : '',
      otpCode: '',
      status: status,
      createdBy: createdBy,
      policyStatus
    };
    
    const created = await User.create(payload);
    if(created){       
      res.status(200).json({ success: true, message: 'User created successfully', newData: created });
    }else{
      res.status(201).json({ success: false, message: 'Unable to create user!' });
    }   
    
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateKey = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(201).json({ status: 409, success:false , message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

const getAllUsers = async (req, res) => {
  try {
      const { keyword, role } = req.query;

      let query = {};

      if (role) {
        query.role = role;
      }

      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } }
        ];
      }

      const users = await User.find(query).populate('address').populate('bank').sort({ createdAt: -1 }).select('-password');;
      res.json(users);
      
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const role = req.params.role;
    const query = {};
    if (role && allowedRoles.includes(role)) {
      query.role = role;
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: true, message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.body.name != null) user.name = req.body.name;
    if (req.body.email != null) user.email = String(req.body.email).toLowerCase();
    if (req.body.phone != null) user.phone = req.body.phone;
    if (req.body.status != null) user.status = req.body.status;
    if (req.body.password != null && String(req.body.password).trim()) {
      user.password = await bcrypt.hash(String(req.body.password).trim(), 10);
    }

    if (user.role === 'investor' && req.body.gender != null) {
      user.gender = req.body.gender;
    }

    if (user.role === 'driver') {
      if (req.body.code != null) user.code = req.body.code;
      if (req.body.drivingLicenceNo != null) user.drivingLicenceNo = req.body.drivingLicenceNo;
    }

    const updated = await user.save();
    res.json(updated);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateKey = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ success: false, message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

const updateUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.body.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.status = req.body.status;
   
    const updated = await user.save();  

    // await updated.populate('address');
    // await updated.populate('bank');
    await updated.populate(['address', 'bank']);

    if(updated)
      return res.status(200).json({ success: true, updatedData: updated});
    else
      return res.status(201).json({ success: false });
  } catch (error) {    
    res.status(400).json({ success: false, message: error.message });
  }
}

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await InvestorProfileModel.findOneAndDelete({ userId: req.params.id });
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success:false, message: error.message });
  }
}

const verifyEmail = async (req, res) => {
  try {
    const { otp, userId, password } = req.body;

    // 1. Find the user
    const user = await User.findById(userId);

    if (!user) {
      // 404 is more semantically correct for "Not Found"
      return res.status(201).json({ success: false, message: "User not found." });
    }

    // 2. Compare OTP (Ensure types match)
    // Using != instead of !== if you want to allow string vs number comparison,
    // or cast both to String to be safe.
    if (String(user.otpCode) !== String(otp)) {
      return res.status(201).json({ success: false, message: "Invalid OTP code." });
    }

    // 3. Update and Save
    user.emailVerified = true;
    
    // Highly recommended: Clear the OTP so it's a "One-Time" Password
    user.otpCode = null; 

    await user.save(); // CRITICAL: Wait for DB to finish

    //send greeting email
    const data = {user:user.name, email:user.email, password: password, company: 'JaiRam Group', date: new Date().toLocaleDateString()};
    sendGreetingEmail(data);


    return res.status(200).json({      
      success: true,
      message: "Email verified successfully!",
    });

  } catch (error) {
    res.status(201).json({ success: false, message: "Server error", error: error.message });
  }
}

const agreePolicy = async (req, res) => {
  try {
    const { status, userId } = req.body;
    const updatedProfile = await User.findOneAndUpdate(
      { _id: userId },
      { policyStatus:status }, 
      { new: false }
    );

    if (!updatedProfile) {
      return res.status(201).json({ success: false, message: 'No profile found for this user ID.' });     
    }

    return res.status(200).json({ success: true, message: 'Policy updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

const changePassword = async (req, res) => {
  //code
}

module.exports = {
  signIn,
  signUp,
  signUpDirect,
  getAllUsers,
  getUsersByRole,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  verifyEmail,
  agreePolicy,
  changePassword
};
