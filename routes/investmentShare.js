const express = require('express');
const router = express.Router();
const { InvestmentShareModel } = require('../models/investmentShare');
const { InvestorModal } = require('../models/investor');
const { InvestorProfileModel } = require('../models/investorProfile');
const { Counter } = require('../models/counter');
const { InvestmentWalletModel } = require('../models/investmentWallet');
const { InvestmentShareFundUsageModel } = require('../models/investmentShareFundUsage');
const { normalizeActivationTime } = require('../utils/investmentWalletAccrual');

const attachInvestorDetails = async (investmentShares) => {
  const list = Array.isArray(investmentShares) ? investmentShares : [investmentShares];
  const investorIds = Array.from(
    new Set(
      list
        .map((item) => String(item?.investorId || ''))
        .filter(Boolean)
    )
  );

  const investors = await InvestorModal.find({ _id: { $in: investorIds } }).select('name investorCode');
  const profiles = await InvestorProfileModel.find({ userId: { $in: investorIds } }).select(
    'userId investorCode totalInvested'
  );
  const profileMap = new Map(profiles.map((item) => [String(item.userId), item.toJSON()]));
  const investorMap = new Map(
    investors.map((item) => {
      const profile = profileMap.get(String(item._id)) || {};
      return [
        String(item._id),
        {
          ...item.toJSON(),
          investorCode: item.investorCode || profile.investorCode || '',
          totalInvested: Number(profile.totalInvested || 0),
        },
      ];
    })
  );

  return list.map((item) => {
    const payload = item?.toJSON ? item.toJSON() : item;
    const investor = investorMap.get(String(payload?.investorId || '')) || null;
    return { ...payload, investorId: investor };
  });
};

const getUsedInvestmentAmount = async (investorId, excludeShareId = null) => {
  const match = { investorId };
  if (excludeShareId) {
    match._id = { $ne: excludeShareId };
  }

  const result = await InvestmentShareModel.aggregate([
    { $match: match },
    { $group: { _id: null, usedAmount: { $sum: '$totalInvestmentAmount' } } },
  ]);

  return Number(result?.[0]?.usedAmount || 0);
};

const getNextInvestmentShareCode = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'investmentShareCode',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const investmentCode = `INV${String(counter.seq).padStart(4, '0')}`;
    const alreadyExists = await InvestmentShareModel.exists({ investmentCode });
    if (!alreadyExists) {
      return investmentCode;
    }
  }

  throw new Error('Unable to generate unique investment code');
};

const calculateProfitAmount = (shareType, shareValue, totalInvestmentAmount, dieselPerLitreValue = 0) => {
  const share = Number(shareValue) || 0;
  const total = Number(totalInvestmentAmount) || 0;
  const dieselPerLitre = Number(dieselPerLitreValue) || 0;

  if (shareType === 'percentage') {
    return Number(((total * share) / 100).toFixed(2));
  }

  if (total <= 0 || dieselPerLitre <= 0) return 0;
  // For per_litre: litres = total investment / per litre amount, then profit = litres * share amount.
  const litres = total / dieselPerLitre;
  return Number((litres * share).toFixed(2));
};

const calculateTotalLitre = (shareType, totalInvestmentAmount, dieselPerLitreValue = 0) => {
  if (shareType !== 'per_litre') return 0;
  const total = Number(totalInvestmentAmount) || 0;
  const dieselPerLitre = Number(dieselPerLitreValue) || 0;
  if (total <= 0 || dieselPerLitre <= 0) return 0;
  return Number((total / dieselPerLitre).toFixed(2));
};

router.get('/', async (req, res) => {
  try {
    const investmentShareList = await InvestmentShareModel.find()
      .sort({ createdAt: -1 });
    const hydrated = await attachInvestorDetails(investmentShareList);
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch investment shares' });
  }
});

router.get('/funds/list', async (req, res) => {
  try {
    const shares = await InvestmentShareModel.find().sort({ createdAt: -1 });
    const hydratedShares = await attachInvestorDetails(shares);

    const usageAgg = await InvestmentShareFundUsageModel.aggregate([
      {
        $group: {
          _id: '$investmentShareId',
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
    ]);

    const usageMap = new Map(
      usageAgg.map((item) => [
        String(item._id),
        {
          debits: Number(item.debits || 0),
          credits: Number(item.credits || 0),
        },
      ])
    );

    const list = hydratedShares.map((item) => {
      const shareId = String(item?._id || item?.id || '');
      const usage = usageMap.get(shareId) || { debits: 0, credits: 0 };
      const totalFundAmount = Number(item?.totalInvestmentAmount || 0);
      const usedFundAmount = Number(usage.debits || 0);
      const reversedFundAmount = Number(usage.credits || 0);
      const availableFundAmount = Number(
        Math.max(totalFundAmount - usedFundAmount + reversedFundAmount, 0).toFixed(2)
      );

      return {
        ...item,
        totalFundAmount,
        usedFundAmount,
        reversedFundAmount,
        availableFundAmount,
      };
    });

    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch investment share funds list' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const investmentShare = await InvestmentShareModel.findById(req.params.id);
    if (!investmentShare) {
      return res.status(404).json({ success: false, msg: 'Investment share not found' });
    }
    const [hydrated] = await attachInvestorDetails(investmentShare);
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to fetch investment share' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { investorId, shareType, share, dieselPerLitre, startDate, date, dailyProfitAmount, walletActivationTime } =
      req.body;

    if (!investorId || !shareType || share === undefined || !startDate || !date) {
      return res.status(400).json({
        success: false,
        msg: 'investorId, shareType, share, startDate and date are required',
      });
    }

    if (shareType === 'per_litre' && Number(dieselPerLitre) <= 0) {
      return res.status(400).json({
        success: false,
        msg: 'dieselPerLitre is required and must be greater than zero for per litre share type',
      });
    }
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(date);
    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid startDate or end date',
      });
    }
    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        msg: 'End date must be same or after start date',
      });
    }

    const investor = await InvestorModal.findById(investorId);
    if (!investor) {
      return res.status(400).json({ success: false, msg: 'Invalid investor selected' });
    }

    const profile = await InvestorProfileModel.findOne({ userId: investor._id });
    const totalInvested = Number(profile?.totalInvested || 0);
    const usedAmount = await getUsedInvestmentAmount(investor._id);
    const availableAmount = Number((totalInvested - usedAmount).toFixed(2));

    if (availableAmount <= 0) {
      return res.status(400).json({
        success: false,
        msg: 'No unused invested amount available for this investor',
      });
    }

    const investmentCode = await getNextInvestmentShareCode();
    // Allocate only unused amount for a new share entry.
    const totalInvestmentAmount = availableAmount;
    const totalLitre = calculateTotalLitre(shareType, totalInvestmentAmount, dieselPerLitre);
    const profitAmount = calculateProfitAmount(shareType, share, totalInvestmentAmount, dieselPerLitre);
    const dailyProfit = Number(dailyProfitAmount);
    const resolvedDailyProfitAmount =
      Number.isFinite(dailyProfit) && dailyProfit >= 0 ? dailyProfit : profitAmount;
    const activationTime = normalizeActivationTime(walletActivationTime);

    const created = await InvestmentShareModel.create({
      investorId,
      investmentCode,
      shareType,
      share,
      dieselPerLitre: shareType === 'per_litre' ? Number(dieselPerLitre) : 0,
      totalLitre,
      totalInvestmentAmount,
      profitAmount,
      dailyProfitAmount: resolvedDailyProfitAmount,
      walletActivationTime: activationTime,
      startDate,
      date,
    });

    await InvestmentWalletModel.findOneAndUpdate(
      { investmentShareId: created._id },
      {
        investorId,
        investmentShareId: created._id,
        amount: 0,
        accruedDays: 0,
        totalCreditedAmount: 0,
        requestedWithdrawalAmount: 0,
        totalWithdrawnAmount: 0,
        status: 'pending_accept',
        acceptedAt: null,
        adminApprovedAt: null,
        withdrawalRequestedAt: null,
        transferredAt: null,
        lastAccruedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to create investment share' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { investorId, shareType, share, dieselPerLitre, startDate, date, dailyProfitAmount, walletActivationTime } =
      req.body;

    const current = await InvestmentShareModel.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, msg: 'Investment share not found' });
    }

    let targetInvestorId = current.investorId;
    let totalInvestmentAmount = Number(current.totalInvestmentAmount || 0);

    if (investorId && String(investorId) !== String(current.investorId)) {
      const investor = await InvestorModal.findById(investorId);
      if (!investor) {
        return res.status(400).json({ success: false, msg: 'Invalid investor selected' });
      }

      const profile = await InvestorProfileModel.findOne({ userId: investor._id });
      const totalInvested = Number(profile?.totalInvested || 0);
      const usedAmount = await getUsedInvestmentAmount(investor._id);
      const availableAmount = Number((totalInvested - usedAmount).toFixed(2));

      if (availableAmount <= 0) {
        return res.status(400).json({
          success: false,
          msg: 'No unused invested amount available for selected investor',
        });
      }

      targetInvestorId = investor._id;
      totalInvestmentAmount = availableAmount;
    }

    const finalShareType = shareType ?? current.shareType;
    const finalShare = share ?? current.share;
    const finalDieselPerLitre =
      dieselPerLitre !== undefined ? Number(dieselPerLitre) : Number(current.dieselPerLitre || 0);

    if (finalShareType === 'per_litre' && finalDieselPerLitre <= 0) {
      return res.status(400).json({
        success: false,
        msg: 'dieselPerLitre is required and must be greater than zero for per litre share type',
      });
    }
    const nextStartDate = startDate ?? current.startDate;
    const nextEndDate = date ?? current.date;
    const parsedStartDate = new Date(nextStartDate);
    const parsedEndDate = new Date(nextEndDate);
    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid startDate or end date',
      });
    }
    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        msg: 'End date must be same or after start date',
      });
    }

    const totalLitre = calculateTotalLitre(finalShareType, totalInvestmentAmount, finalDieselPerLitre);
    const profitAmount = calculateProfitAmount(
      finalShareType,
      finalShare,
      totalInvestmentAmount,
      finalDieselPerLitre
    );
    const requestedDailyProfitAmount = Number(dailyProfitAmount);
    const resolvedDailyProfitAmount =
      dailyProfitAmount !== undefined && Number.isFinite(requestedDailyProfitAmount) && requestedDailyProfitAmount >= 0
        ? requestedDailyProfitAmount
        : current.dailyProfitAmount ?? profitAmount;
    const activationTime =
      walletActivationTime !== undefined
        ? normalizeActivationTime(walletActivationTime)
        : normalizeActivationTime(current.walletActivationTime);

    const updated = await InvestmentShareModel.findByIdAndUpdate(
      req.params.id,
      {
        investorId: targetInvestorId,
        investmentCode: current.investmentCode,
        shareType: finalShareType,
        share: finalShare,
        dieselPerLitre: finalShareType === 'per_litre' ? finalDieselPerLitre : 0,
        totalLitre,
        totalInvestmentAmount,
        profitAmount,
        dailyProfitAmount: resolvedDailyProfitAmount,
        walletActivationTime: activationTime,
        startDate: nextStartDate,
        date: nextEndDate,
      },
      { new: true }
    );

    await InvestmentWalletModel.findOneAndUpdate(
      { investmentShareId: updated._id },
      {
        investorId: targetInvestorId,
        investmentShareId: updated._id,
        status: 'accepted',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const [hydrated] = await attachInvestorDetails(updated);
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to update investment share' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await InvestmentShareModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, msg: 'Investment share not found' });
    }
    return res.status(200).json({ success: true, msg: 'Investment share deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to delete investment share' });
  }
});

module.exports = router;
