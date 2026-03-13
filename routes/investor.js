const { InvestorModal } = require('../models/investor');
const { User } = require('../models/user');
const { Counter } = require('../models/counter');
const { InvestorProfileModel } = require('../models/investorProfile');
const { InvestmentTransactionModel } = require('../models/investmentTransaction');
const { InvestmentWalletModel } = require('../models/investmentWallet');
const { InvestmentShareModel } = require('../models/investmentShare');
const { InvestorFundUsageModel } = require('../models/investorFundUsage');
const { buildAccrualPatch } = require('../utils/investmentWalletAccrual');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const SENDER_EMAIL = 'mexicotailorsranchi@gmail.com';

const getSenderPassword = () => {
  const raw =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASS ||
    process.env.MAIL_PASS ||
    process.env.MAIL_PASSWORD ||
    '';

  return String(raw)
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/\s+/g, '');
};

const getMailTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SENDER_EMAIL,
      pass: getSenderPassword(),
    },
  });

const getNextInvestorCode = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'investorCode',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const investorCode = `JRG${String(counter.seq).padStart(4, '0')}`;
    const alreadyExistsInUser = await InvestorModal.exists({ investorCode });
    const alreadyExistsInProfile = await InvestorProfileModel.exists({ investorCode });

    if (!alreadyExistsInUser && !alreadyExistsInProfile) {
      return investorCode;
    }
  }

  throw new Error('Unable to generate unique investor code');
};

const sendInvestorWelcomeEmail = async ({ toEmail, investorName, investorCode }) => {
  const senderPassword = getSenderPassword();
  if (!senderPassword) {
    throw new Error('GMAIL_APP_PASSWORD is not configured');
  }

  await getMailTransporter().sendMail({
    from: `"Jairam Group" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: 'Welcome to Jairam Group Investor Portal',
    text: `Hello ${investorName}, your investor account is created successfully. Investor Code: ${investorCode}.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Jairam Group</h2>
        <p>Hello <b>${investorName}</b>,</p>
        <p>Your investor account has been created successfully.</p>
        <p><b>Investor Code:</b> ${investorCode}</p>
        <p>Thank you.</p>
      </div>
    `,
  });
};

const hasCompleteKycDetails = (kycDetails) => {
  if (!kycDetails || typeof kycDetails !== 'object') return false;
  return Boolean(
    String(kycDetails.adharNo || '').trim() &&
      String(kycDetails.panCardNo || '').trim() &&
      String(kycDetails.city || '').trim() &&
      String(kycDetails.pincode || '').trim() &&
      String(kycDetails.state || '').trim() &&
      String(kycDetails.country || '').trim()
  );
};

const hasCompleteBankDetails = (bankDetails) => {
  if (!bankDetails || typeof bankDetails !== 'object') return false;
  return Boolean(
    String(bankDetails.holderName || '').trim() &&
      String(bankDetails.bankName || '').trim() &&
      String(bankDetails.accountNo || '').trim() &&
      String(bankDetails.branch || '').trim() &&
      String(bankDetails.ifscCode || '').trim()
  );
};

const canInvestorBeActive = (profile) =>
  hasCompleteKycDetails(profile?.kycDetails) && hasCompleteBankDetails(profile?.bankDetails);

const mergeInvestorWithProfile = (investor, profile) => {
  const investorJson = investor?.toJSON ? investor.toJSON() : investor;
  const profileJson = profile?.toJSON ? profile.toJSON() : profile;
  if (!investorJson) return null;

  return {
    ...investorJson,
    investorCode: investorJson.investorCode || profileJson?.investorCode || '',
    totalInvested: Number(profileJson?.totalInvested || 0),
    kycStatus: profileJson?.kycStatus || 'Pending',
    bankStatus: profileJson?.bankStatus || 'Pending',
    kycDetails: profileJson?.kycDetails || {},
    bankDetails: profileJson?.bankDetails || {},
  };
};

const ensureInvestorProfile = async (investor) => {
  const existing = await InvestorProfileModel.findOne({ userId: investor._id });
  if (existing) return existing;
  return InvestorProfileModel.create({
    userId: investor._id,
    investorCode: investor.investorCode || (await getNextInvestorCode()),
    kycStatus: 'Pending',
    bankStatus: 'Pending',
    kycDetails: {},
    bankDetails: {},
    totalInvested: 0,
  });
};

const mapInvestorsByIds = async (ids = []) => {
  const uniqueIds = Array.from(new Set((ids || []).map((id) => String(id || '')).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const investors = await InvestorModal.find({ _id: { $in: uniqueIds } }).select('name email investorCode');
  const profiles = await InvestorProfileModel.find({ userId: { $in: uniqueIds } });
  const profileMap = new Map(profiles.map((item) => [String(item.userId), item]));

  const mapped = investors.map((investor) => {
    const profile = profileMap.get(String(investor._id)) || null;
    return [String(investor._id), mergeInvestorWithProfile(investor, profile)];
  });

  return new Map(mapped);
};

const applyAccrualForWallet = async (walletDoc) => {
  const wallet = walletDoc;
  if (!wallet) return wallet;
  const share = await InvestmentShareModel.findById(wallet.investmentShareId);
  if (!share) return wallet;

  const { changed, patch } = buildAccrualPatch(wallet, share, new Date());
  if (!changed || !patch || Object.keys(patch).length === 0) {
    return wallet;
  }

  Object.assign(wallet, patch);
  await wallet.save();
  return wallet;
};

const applyAccrualForWalletList = async (walletDocs = []) => {
  const updated = [];
  for (const wallet of walletDocs) {
    updated.push(await applyAccrualForWallet(wallet));
  }
  return updated;
};

const requestWalletWithdrawal = async (walletDoc, requestedAmountRaw) => {
  const wallet = await applyAccrualForWallet(walletDoc);
  if (!wallet) {
    return { ok: false, status: 404, msg: 'Wallet entry not found' };
  }

  const availableAmount = Number(wallet.amount || 0);
  if (availableAmount <= 0) {
    return { ok: false, status: 400, msg: 'Wallet has no available amount to withdraw' };
  }

  const requestedAmountParsed = Number(requestedAmountRaw);
  const requestedAmount =
    requestedAmountRaw === undefined || requestedAmountRaw === null || requestedAmountRaw === ''
      ? availableAmount
      : requestedAmountParsed;

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return { ok: false, status: 400, msg: 'Invalid withdrawal amount' };
  }

  if (requestedAmount > availableAmount) {
    return { ok: false, status: 400, msg: 'Withdrawal amount cannot exceed available wallet amount' };
  }

  if (!['pending_accept', 'accepted'].includes(wallet.status)) {
    return { ok: false, status: 400, msg: `Wallet already ${wallet.status}` };
  }

  wallet.status = 'withdraw_requested';
  wallet.requestedWithdrawalAmount = Number(requestedAmount.toFixed(2));
  wallet.withdrawalRequestedAt = new Date();
  await wallet.save();

  return { ok: true, wallet };
};

router.post('/signup', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const emailRaw = String(req.body.email || '').trim();
  const email = emailRaw.toLowerCase();
  const password = String(req.body.password || '');
  const gender = String(req.body.gender || '').trim();
  const status = String(req.body.status || '').trim();

  if (!name || !email || !password || !gender || !status || !phone) {
    return res.status(400).json({ msg: 'name, phone,  email, gender, status and password are required' });
  }

  try {
    const existingInvestorEmail = await User.findOne({ email });
    const existingInvestorPhone = await User.findOne({ phone });
    if (existingInvestorEmail) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }
    if (existingInvestorPhone) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const investorCode = await getNextInvestorCode();

    const result = await InvestorModal.create({
      investorCode,
      name,
      email,
      phone,
      password: hashPassword,
      gender,
      status: status && String(status).toLowerCase() === 'active' ? 'Pending' : status || 'Pending',
    });

    await InvestorProfileModel.create({
      userId: result._id,
      investorCode,
      kycStatus: 'Pending',
      bankStatus: 'Pending',
      kycDetails: {},
      bankDetails: {},
      totalInvested: 0,
    });

    const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
    const token = secret ? jwt.sign({ email: result.email, id: result._id }, secret, { expiresIn: '7d' }) : null;

    let mailSent = false;
    let mailError = null;

    try {
      await sendInvestorWelcomeEmail({
        toEmail: result.email,
        investorName: result.name,
        investorCode,
      });
      mailSent = true;
    } catch (mailErr) {
      mailError = mailErr.message;
      console.error('Investor welcome email failed:', mailErr.message);
    }

    const merged = mergeInvestorWithProfile(
      result,
      await InvestorProfileModel.findOne({ userId: result._id })
    );

    return res.status(201).json({
      user: merged,
      token,
      mailSent,
      mailError,
      msg: secret
        ? 'Investor created successfully'
        : 'Investor created successfully (token disabled: JWT secret not set)',
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({
        status: false,
        msg: 'User already exists with same email/phone/code',
      });
    }
    return res.status(500).json({ status: false, msg: error?.message || 'Something went wrong' });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await InvestorModal.findOne({ email: email });
    if (!existingUser) {
      return res.status(400).json({ msg: 'User Not Found' });
    }
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(400).json({ msg: 'Invalid Credential' });
    }

    const secret = process.env.JWT_SECRET || process.env.JSON_WEB_TOKEN_SECRETE_KET;
    const token = jwt.sign({ email: existingUser.email, id: existingUser._id }, secret);
    const profile = await ensureInvestorProfile(existingUser);

    return res.status(200).json({
      user: mergeInvestorWithProfile(existingUser, profile),
      token: token,
      msg: 'user authenticated',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Something went wrong' });
  }
});

router.post('/invest', async (req, res) => {
  try {
    const { investorId, amount, duration, paymentMode, date, note } = req.body;

    if (!investorId || amount === undefined) {
      return res.status(400).json({ success: false, msg: 'investorId and amount are required' });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, msg: 'Amount must be greater than zero' });
    }

    const investor = await InvestorModal.findById(investorId);
    if (!investor) {
      return res.status(404).json({ success: false, msg: 'Investor not found' });
    }

    const profile = await ensureInvestorProfile(investor);
    if (!hasCompleteKycDetails(profile.kycDetails) || !hasCompleteBankDetails(profile.bankDetails)) {
      return res.status(400).json({
        success: false,
        msg: 'Please submit complete KYC and Bank details before investing',
      });
    }

    const transaction = await InvestmentTransactionModel.create({
      investorId,
      amount: parsedAmount,
      duration: duration,
      paymentMode: paymentMode,
      date: date || new Date(),
      note: note || '',
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      msg: 'Investment request submitted and waiting for admin verification',
      transaction,
      investor: mergeInvestorWithProfile(investor, profile),
    });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to add investment' });
  }
});

router.get('/investments/investor/:investorId', async (req, res) => {
  try {
    const list = await InvestmentTransactionModel.find({ investorId: req.params.investorId }).sort({ date: -1 });
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch investments' });
  }
});

router.get('/investments/admin/list', async (req, res) => {
  try {
    const list = await InvestmentTransactionModel.find().sort({ createdAt: -1 });
    const investorMap = await mapInvestorsByIds(list.map((item) => item?.investorId));
    const hydrated = list.map((item) => {
      const payload = item.toJSON();
      const investor = investorMap.get(String(payload?.investorId || '')) || null;
      return { ...payload, investorId: investor };
    });
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch investment requests' });
  }
});

router.put('/investments/:transactionId/verify', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, msg: "status must be 'verified' or 'rejected'" });
    }

    const txn = await InvestmentTransactionModel.findById(req.params.transactionId);
    if (!txn) {
      return res.status(404).json({ success: false, msg: 'Investment request not found' });
    }

    if (txn.status !== 'pending') {
      return res.status(400).json({ success: false, msg: `Request already ${txn.status}` });
    }

    txn.status = status;
    txn.adminNote = adminNote || '';
    if (status === 'verified') {
      txn.verifiedAt = new Date();
      await InvestorProfileModel.findOneAndUpdate(
        { userId: txn.investorId },
        { $inc: { totalInvested: txn.amount } },
        { upsert: true }
      );
    } else {
      txn.rejectedAt = new Date();
    }

    await txn.save();
    return res.status(200).json({ success: true, msg: `Investment ${status} successfully`, transaction: txn });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to verify investment request' });
  }
});

router.get('/wallet/investor/:investorId', async (req, res) => {
  try {
    const walletList = await InvestmentWalletModel.find({ investorId: req.params.investorId })
      .populate(
        'investmentShareId',
        'investmentCode shareType share totalInvestmentAmount dailyProfitAmount walletActivationTime startDate date'
      )
      .sort({ createdAt: -1 });
    const accruedWalletList = await applyAccrualForWalletList(walletList);
    return res.status(200).json(accruedWalletList);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch wallet' });
  }
});

router.put('/wallet/:walletId/accept', async (req, res) => {
  try {
    const wallet = await InvestmentWalletModel.findById(req.params.walletId);
    const requested = await requestWalletWithdrawal(wallet, req.body?.amount);
    if (!requested.ok) {
      return res.status(requested.status).json({ success: false, msg: requested.msg });
    }
    requested.wallet.acceptedAt = requested.wallet.acceptedAt || new Date();
    await requested.wallet.save();
    return res
      .status(200)
      .json({ success: true, msg: 'Wallet withdraw requested successfully', wallet: requested.wallet });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to accept wallet amount' });
  }
});

router.put('/wallet/:walletId/withdraw', async (req, res) => {
  try {
    const wallet = await InvestmentWalletModel.findById(req.params.walletId);
    const requested = await requestWalletWithdrawal(wallet, req.body?.amount);
    if (!requested.ok) {
      return res.status(requested.status).json({ success: false, msg: requested.msg });
    }
    return res.status(200).json({ success: true, msg: 'Withdraw request submitted successfully', wallet: requested.wallet });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to submit withdraw request' });
  }
});

router.get('/wallet/admin/list', async (req, res) => {
  try {
    const walletList = await InvestmentWalletModel.find()
      .populate(
        'investmentShareId',
        'investmentCode shareType share totalInvestmentAmount dailyProfitAmount walletActivationTime startDate date'
      )
      .sort({ createdAt: -1 });
    const accruedWalletList = await applyAccrualForWalletList(walletList);
    const investorMap = await mapInvestorsByIds(walletList.map((item) => item?.investorId));
    const hydrated = accruedWalletList.map((item) => {
      const payload = item.toJSON();
      const investor = investorMap.get(String(payload?.investorId || '')) || null;
      return { ...payload, investorId: investor };
    });
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch admin wallet list' });
  }
});

router.get('/available-funds/list', async (req, res) => {
  try {
    const [investors, verifiedTxAgg, allocatedAgg, fundUsageAgg] = await Promise.all([
      InvestorModal.find().select('name email investorCode'),
      InvestmentTransactionModel.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: '$investorId', invested: { $sum: '$amount' } } },
      ]),
      InvestmentShareModel.aggregate([
        { $group: { _id: '$investorId', allocated: { $sum: '$totalInvestmentAmount' } } },
      ]),
      InvestorFundUsageModel.aggregate([
        {
          $group: {
            _id: '$investorId',
            debits: {
              $sum: {
                $cond: [{ $eq: ['$entryType', 'debit'] }, '$amount', 0],
              },
            },
            credits: {
              $sum: {
                $cond: [{ $eq: ['$entryType', 'credit'] }, '$amount', 0],
              },
            },
          },
        },
      ]),
    ]);

    const investedMap = new Map(verifiedTxAgg.map((item) => [String(item._id), Number(item.invested || 0)]));
    const allocatedMap = new Map(allocatedAgg.map((item) => [String(item._id), Number(item.allocated || 0)]));
    const usageMap = new Map(
      fundUsageAgg.map((item) => [
        String(item._id),
        {
          debits: Number(item.debits || 0),
          credits: Number(item.credits || 0),
        },
      ])
    );

    const list = investors.map((inv) => {
      const investorId = String(inv._id);
      const invested = Number(investedMap.get(investorId) || 0);
      const allocated = Number(allocatedMap.get(investorId) || 0);
      const usage = usageMap.get(investorId) || { debits: 0, credits: 0 };
      const available = Number(Math.max(invested - allocated - usage.debits + usage.credits, 0).toFixed(2));
      return {
        _id: inv._id,
        id: inv._id,
        investorCode: inv.investorCode || '',
        name: inv.name || '',
        email: inv.email || '',
        totalInvested: invested,
        allocatedAmount: allocated,
        purchaseDebits: Number(usage.debits || 0),
        purchaseCredits: Number(usage.credits || 0),
        availableAmount: available,
      };
    });

    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch available investor funds list' });
  }
});

router.put('/:id/kyc-details', async (req, res) => {
  try {
    const source = req.body?.kycDetails && typeof req.body.kycDetails === 'object' ? req.body.kycDetails : req.body;

    const adharNo = source?.adharNo ?? source?.aadhaarNo ?? source?.aadharNo;
    const panCardNo = source?.panCardNo ?? source?.pancardNo ?? source?.panNo;
    const address = source?.address;
    const city = source?.city;
    const pinCode = source?.pinCode;
    const state = source?.state;
    const country = source?.country;
    const investorType = source?.investorType;

    if (!adharNo || !panCardNo || !address || !city || !pinCode || !state || !country) {
      return res.status(400).json({ success: false, msg: 'All KYC fields are required' });
    }

    const kycDetails = {
      adharNo: String(adharNo).trim(),
      panCardNo: String(panCardNo).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      country: String(country).trim(),
      pinCode: String(pinCode).trim(),
      investorType: String(investorType).trim(),
    };

    const updated = await InvestorProfileModel.findOneAndUpdate(
      { userId: req.params.id },
      {
        kycDetails,
        kycStatus: 'Verified',
      },
      { new: true, upsert: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, msg: 'Investor not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: error });
  }
});

router.put('/:id/bank-details', async (req, res) => {
  try {
    const source =
      req.body?.bankDetails && typeof req.body.bankDetails === 'object' ? req.body.bankDetails : req.body;

    const holderName = source?.holderName ?? source?.accountHolderName;
    const bankName = source?.bankName;
    const accountNo = source?.accountNo ?? source?.accountNumber;
    const branch = source?.branch;
    const ifscCode = source?.ifscCode ?? source?.ifsc;

    if (!holderName || !bankName || !accountNo || !branch || !ifscCode) {
      return res.status(400).json({ success: false, msg: 'All bank fields are required' });
    }

    const bankDetails = {
      holderName: String(holderName).trim(),
      bankName: String(bankName).trim(),
      accountNo: String(accountNo).trim(),
      branch: String(branch).trim(),
      ifscCode: String(ifscCode).trim(),
    };

    const updated = await InvestorProfileModel.findOneAndUpdate(
      { userId: req.params.id },
      {
        bankDetails,
        bankStatus: 'Verified',
      },
      { new: true, upsert: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, msg: 'Investor not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to update bank details' });
  }
});

router.put('/wallet/:walletId/admin-approve', async (req, res) => {
  try {
    const wallet = await applyAccrualForWallet(await InvestmentWalletModel.findById(req.params.walletId));
    if (!wallet) {
      return res.status(404).json({ success: false, msg: 'Wallet entry not found' });
    }
    if (!['withdraw_requested', 'accepted'].includes(wallet.status)) {
      return res.status(400).json({ success: false, msg: 'Wallet must be withdrawn by investor first' });
    }
    if (Number(wallet.requestedWithdrawalAmount || 0) <= 0) {
      return res.status(400).json({ success: false, msg: 'No withdrawal amount requested' });
    }

    wallet.status = 'admin_approved';
    wallet.adminApprovedAt = new Date();
    await wallet.save();
    return res.status(200).json({ success: true, msg: 'Wallet withdraw verified by admin', wallet });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to approve wallet' });
  }
});

router.put('/wallet/:walletId/transfer', async (req, res) => {
  try {
    const wallet = await applyAccrualForWallet(await InvestmentWalletModel.findById(req.params.walletId));
    if (!wallet) {
      return res.status(404).json({ success: false, msg: 'Wallet entry not found' });
    }
    if (wallet.status !== 'admin_approved') {
      return res.status(400).json({ success: false, msg: 'Wallet must be admin approved first' });
    }

    const transferAmount = Number(wallet.requestedWithdrawalAmount || 0);
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, msg: 'No approved transfer amount found' });
    }
    if (transferAmount > Number(wallet.amount || 0)) {
      return res.status(400).json({ success: false, msg: 'Transfer amount exceeds wallet amount' });
    }

    wallet.amount = Number((Number(wallet.amount || 0) - transferAmount).toFixed(2));
    wallet.totalWithdrawnAmount = Number((Number(wallet.totalWithdrawnAmount || 0) + transferAmount).toFixed(2));
    wallet.requestedWithdrawalAmount = 0;
    wallet.status = 'accepted';
    wallet.transferredAt = new Date();
    await wallet.save();
    return res.status(200).json({ success: true, msg: 'Wallet amount transferred', wallet, transferAmount });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to transfer wallet amount' });
  }
});

router.get('/', async (req, res) => {
  const investorList = await User.find();
  if (!investorList) {
    res.status(500).json({
      success: false,
    });
    return;
  }

  for (const investor of investorList) {
    await ensureInvestorProfile(investor);
  }

  const profiles = await InvestorProfileModel.find({
    userId: { $in: investorList.map((item) => item._id) },
  });
  const profileMap = new Map(profiles.map((item) => [String(item.userId), item]));
  const merged = investorList.map((item) => mergeInvestorWithProfile(item, profileMap.get(String(item._id))));

  res.send(merged);
});

router.get('/get/count', async (req, res) => {
  try {
    const userCount = await InvestorModal.countDocuments();

    res.status(200).json({
      success: true,
      userCount: userCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await InvestorModal.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        msg: 'User with given ID was not found',
      });
    }

    const profile = await ensureInvestorProfile(user);
    return res.status(200).json(mergeInvestorWithProfile(user, profile));
  } catch (error) {
    return res.status(500).json({
      msg: 'Server error',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  InvestorModal.findByIdAndDelete(req.params.id)
    .then(async (user) => {
      if (user) {
        await InvestorProfileModel.findOneAndDelete({ userId: req.params.id });
        return res.status(200).json({
          success: true,
          msg: 'The user is deleted',
        });
      }
      return res.status(404).json({
        success: false,
        msg: ' User not found',
      });
    })
    .catch((error) => {
      return res.status(500).json({
        success: false,
        error: error,
      });
    });
});

router.put('/:id', async (req, res) => {
  const { name, phone, email, password, gender, status } = req.body;
  const userExist = await InvestorModal.findById(req.params.id);

  if (!userExist) {
    return res.status(404).send('the user is not found');
  }

  const profile = await ensureInvestorProfile(userExist);

  let newPassword;
  if (req.body.password) {
    newPassword = bcrypt.hashSync(req.body.password, 10);
  } else {
    newPassword = userExist.password;
  }

  const isTryingToSetActive = String(status || '').toLowerCase() === 'active';
  if (isTryingToSetActive && !canInvestorBeActive(profile)) {
    return res.status(400).json({
      success: false,
      msg: 'Investor cannot be Active until KYC and Bank details are submitted',
    });
  }

  const user = await InvestorModal.findByIdAndUpdate(
    req.params.id,
    {
      name: name,
      phone: phone,
      email: email,
      gender: gender ?? userExist.gender,
      status: status ?? userExist.status,
      password: newPassword,
    },
    {
      new: true,
    }
  );

  if (!user) {
    return res.status(400).send('the user cant be updated');
  }

  const updatedProfile = await ensureInvestorProfile(user);
  return res.send(mergeInvestorWithProfile(user, updatedProfile));
});

router.get('/dashboard/:id', async (req, res) => {
  try {
    const investorId = req.params.id;
   
    let policyStatus = 'pending';
    const profile = await InvestorProfileModel.findOne({ userId: investorId }); 
    if(profile){
      policyStatus = profile.policyStatus ?? 'pending';
    }
       
    const invest = await InvestmentTransactionModel.aggregate([
      {
        // 1. Filter the documents
        $match: {
          investorId: investorId,
          status: 'verified'
        }
      },
      {
        // 2. Group them and sum the 'amount' field
        $group: {
          _id: null, // We don't need a specific group key, we just want one total
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const wallet = await InvestmentWalletModel.aggregate([
      {
        // 1. Filter the documents
        $match: {
          investorId: investorId,
          status: 'accepted'
        }
      },
      {
        // 2. Group and calculate multiple metrics
        $group: {
          _id: null,          

          // Total Profit (Total amount credited over time)
          totalProfit: { $sum: '$totalCreditedAmount' },

          // Total Withdrawn
          totalWithdrawn: { $sum: '$totalWithdrawnAmount' },

          // Net Balance: (Principal + Profits) - Withdrawals
          netBalance: { 
            $sum: { 
              $subtract: [
                { $add: ['$amount', '$totalCreditedAmount'] }, 
                '$totalWithdrawnAmount'
              ] 
            } 
          }
        }
      }
    ]);

    const totalInvestedAmount = invest.length > 0 ? invest[0].totalAmount : 0;

    // Result handling
    const stats = wallet.length > 0 ? wallet[0] : {totalProfit: 0, totalWithdrawn: 0, netBalance: 0 };

    const summary = [
      { title: 'Investment', subtitle: 'Invested amount', value: totalInvestedAmount, progress: 60, theme: 'green', trend: 'up' },
      { title: 'Total Profit', subtitle: 'Total profit amount', value: stats.totalProfit, progress: 60, theme: 'orange', trend: 'up' },
      { title: 'Witdhdraw', subtitle: 'Total withdrawal amount', value: stats.totalWithdrawn, progress: 60, theme: 'blue', trend: 'up' },
      { title: 'Balance ', subtitle: 'Total Balance in wallet', value: stats.netBalance, progress: 60, theme: 'red', trend: 'down' }
    ];
   
    return res.status(200).json({ policyStatus, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/update-policy', async (req, res) => {
  try {
    const { status, userId } = req.body;
    const updatedProfile = await InvestorProfileModel.findOneAndUpdate(
      { userId: userId },       // 1. The Filter (where)
      { policyStatus:'agree' }, // 2. The Update (set)
      { new: false }             // 3. Options (true if want to return the updated doc)
    );

    if (!updatedProfile) {
      return res.status(200).json({ success: false, message: 'No profile found for this user ID.' });     
    }

    return res.status(200).json({ success: true, message: 'Policy updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
