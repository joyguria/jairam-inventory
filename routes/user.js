const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models/user');
const { Counter } = require('../models/counter');
const { InvestorProfileModel } = require('../models/investorProfile');
const transporter = require('../utils/mailer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require('fs');
const path = require('path');

const router = express.Router();

const allowedRoles = ['admin', 'investor', 'driver', 'agent', 'employee'];

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

router.get('/', async (req, res) => {
  try {
    const role = String(req.query.role || '').trim();
    const query = {};
    if (role && allowedRoles.includes(role)) {
      query.role = role;
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const role = String(req.body.role || '').trim().toLowerCase();
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const passwordRaw = String(req.body.password || '').trim();

    if (!name || !email || !phone) {
      return res.status(200).json({ status:401, message: 'name, email and phone are required' });
    }
    if ((role === 'admin' || role === 'investor' || role === 'agent' || role === 'employee') && !passwordRaw) {
      return res.status(200).json({ status:401, message: `password is required for role ${role}` });
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) return res.status(400).json({ message: 'User already exists with this email' });
    const existingByPhone = await User.findOne({ phone });
    if (existingByPhone) return res.status(400).json({ message: 'User already exists with this phone' });

    const otp = crypto.randomInt(100000, 999999).toString();

    const payload = {
      role,
      name,
      email,
      phone,
      password: passwordRaw ? await bcrypt.hash(passwordRaw, 10) : '',
      otpCode: otp,
      status: req.body.status || 'active',
      createdBy: req.body.createdBy || 'admin',
    };

    if (role === 'investor') {
      payload.gender = req.body.gender || 'Male';
      payload.investorCode = req.body.investorCode || (await getNextInvestorCode());
    }

    if (role === 'driver') {
      payload.code = req.body.code || '';
      payload.drivingLicenceNo = req.body.drivingLicenceNo || '';
      if (!payload.code || !payload.drivingLicenceNo) {
        return res.status(200).json({ status: 401, message: 'code and drivingLicenceNo are required for driver' });
      }
    }

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
    if (role === 'investor') {
      await InvestorProfileModel.findOneAndUpdate(
        { userId: created._id },
        {
          userId: created._id,
          investorCode: created.investorCode,
          kycStatus: 'Pending',
          bankStatus: 'Pending',          
          kycDetails: {},
          bankDetails: {},
          policyStatus: 'pending',
          totalInvested: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.status(201).json({status: 200, id: created._id});
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateKey = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(200).json({ status: 409, message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: error.message });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const userIdRaw = String(req.body.userId || req.body.email || '').trim();
    const userId = userIdRaw.toLowerCase();
    const password = String(req.body.password || '').trim();

    if (!userId || !password) return res.status(400).json({ message: 'userId and password are required' });

    const query = {
      $or: [
        { email: userId },
        { phone: userIdRaw },
        { investorCode: userIdRaw.toUpperCase() },
        { code: userIdRaw.toUpperCase() },
      ],
    };
    if (mongoose.Types.ObjectId.isValid(userIdRaw)) {
      query.$or.push({ _id: userIdRaw });
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });

    return res.status(200).json({ user, token, msg: 'user authenticated' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

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
      return res.status(409).json({ message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await InvestorProfileModel.findOneAndDelete({ userId: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/migrate-legacy', async (req, res) => {
  try {
    const db = User.db;
    const legacyAdmins = await db.collection('admins').find({}).toArray();
    const legacyInvestors = await db.collection('investors').find({}).toArray();
    const legacyDrivers = await db.collection('drivers').find({}).toArray();

    let migrated = 0;
    let skipped = 0;

    const upsertUser = async (payload) => {
      if (!payload.email) {
        skipped += 1;
        return null;
      }
      const existing = await User.findOne({ email: String(payload.email).toLowerCase() });
      if (existing) {
        skipped += 1;
        return existing;
      }
      const created = await User.create(payload);
      migrated += 1;
      return created;
    };

    for (const item of legacyAdmins) {
      await upsertUser({
        role: 'admin',
        name: item.name || 'Admin',
        email: String(item.email || '').toLowerCase(),
        phone: item.phone || '',
        password: item.password || '',
        status: item.status || 'Active',
        createdBy: item.createdBy || '',
      });
    }

    for (const item of legacyInvestors) {
      const investorCode = item.investorCode || (await getNextInvestorCode());
      const investorUser = await upsertUser({
        role: 'investor',
        investorCode,
        name: item.name || '',
        email: String(item.email || '').toLowerCase(),
        phone: item.phone || '',
        gender: item.gender || 'Male',
        password: item.password || '',
        status: item.status || 'Pending',
        createdBy: item.createdBy || '',
      });

      if (investorUser) {
        await InvestorProfileModel.findOneAndUpdate(
          { userId: investorUser._id },
          {
            userId: investorUser._id,
            investorCode,
            kycStatus: item.kycStatus || 'Pending',
            bankStatus: item.bankStatus || 'Pending',
            kycDetails: item.kycDetails || {},
            bankDetails: item.bankDetails || {},
            totalInvested: Number(item.totalInvested || 0),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    for (const item of legacyDrivers) {
      await upsertUser({
        role: 'driver',
        code: item.code || '',
        drivingLicenceNo: item.drivingLicenceNo || '',
        name: item.name || '',
        email: String(item.email || '').toLowerCase(),
        phone: item.phone || '',
        password: item.password || '',
        status: item.status || 'Active',
        createdBy: item.createdBy || '',
      });
    }

    return res.status(200).json({
      success: true,
      migrated,
      skipped,
      message: 'Legacy users migration completed',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

//ADD by Alex
router.post('/verify', async (req, res) => {
  try {
    const { otp, userId, password } = req.body;

    // 1. Find the user
    const user = await User.findById(userId);

    if (!user) {
      // 404 is more semantically correct for "Not Found"
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Compare OTP (Ensure types match)
    // Using != instead of !== if you want to allow string vs number comparison,
    // or cast both to String to be safe.
    if (String(user.otpCode) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP code." });
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
    console.error("Verification Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
