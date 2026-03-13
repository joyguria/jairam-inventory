const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Purchase = require('../models/purchase');
const Tank = require('../models/tank');
const { InvestorModal } = require('../models/investor');
const { InvestmentTransactionModel } = require('../models/investmentTransaction');
const { InvestmentShareModel } = require('../models/investmentShare');
const { InvestorFundUsageModel } = require('../models/investorFundUsage');
const { InvestmentShareFundUsageModel } = require('../models/investmentShareFundUsage');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveTank = async (tankId, tankCode) => {
  if (tankId) {
    const byId = await Tank.findById(tankId);
    if (byId) return byId;
  }
  if (tankCode) {
    const byCode = await Tank.findOne({ code: tankCode });
    if (byCode) return byCode;
  }
  return null;
};

const applyTankDelta = async (tankId, tankCode, quantityDelta) => {
  const qty = toNumber(quantityDelta);
  if (!qty) return;

  const tank = await resolveTank(tankId, tankCode);
  if (!tank) {
    throw new Error('Selected tank not found');
  }

  const nextCurrent = toNumber(tank.currentStock) + qty;
  if (nextCurrent < 0) {
    throw new Error(`Insufficient stock in tank ${tank.code}`);
  }

  if (nextCurrent < toNumber(tank.reservedStock)) {
    throw new Error(`Tank ${tank.code} stock cannot go below reserved stock`);
  }

  tank.currentStock = nextCurrent;
  tank.availableStock = Math.max(nextCurrent - toNumber(tank.reservedStock), 0);
  await tank.save();
};

const getInvestorAvailableFunds = async (investorId) => {
  const normalizedInvestorId = String(investorId || '').trim();
  if (!normalizedInvestorId) return 0;
  if (!mongoose.Types.ObjectId.isValid(normalizedInvestorId)) return 0;

  const [verifiedInvestedAgg, allocatedAgg, fundUsageAgg] = await Promise.all([
    InvestmentTransactionModel.aggregate([
      { $match: { investorId: new mongoose.Types.ObjectId(normalizedInvestorId), status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    InvestmentShareModel.aggregate([
      { $match: { investorId: new mongoose.Types.ObjectId(normalizedInvestorId) } },
      { $group: { _id: null, total: { $sum: '$totalInvestmentAmount' } } },
    ]),
    InvestorFundUsageModel.aggregate([
      { $match: { investorId: new mongoose.Types.ObjectId(normalizedInvestorId) } },
      {
        $group: {
          _id: null,
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

  const invested = Number(verifiedInvestedAgg?.[0]?.total || 0);
  const allocated = Number(allocatedAgg?.[0]?.total || 0);
  const debits = Number(fundUsageAgg?.[0]?.debits || 0);
  const credits = Number(fundUsageAgg?.[0]?.credits || 0);
  return Number(Math.max(invested - allocated - debits + credits, 0).toFixed(2));
};

const getPurchaseFundImpact = (purchaseLike) => {
  if (!purchaseLike) return null;
  const source = String(purchaseLike.fundSource || 'business_cash').trim();
  if (!['investor_available', 'investment_share'].includes(source)) return null;

  const investorId = purchaseLike.fundInvestorId || null;
  const investmentShareId = purchaseLike.fundInvestmentShareId || null;
  const amountRaw =
    purchaseLike.fundAmount !== undefined && purchaseLike.fundAmount !== null && purchaseLike.fundAmount !== ''
      ? purchaseLike.fundAmount
      : purchaseLike.netAmount;
  const amount = toNumber(amountRaw);

  if (source === 'investor_available' && !investorId) return null;
  if (source === 'investment_share' && !investmentShareId) return null;
  if (amount <= 0) return null;
  return {
    source,
    investorId: String(investorId),
    investmentShareId: String(investmentShareId),
    amount: Number(amount.toFixed(2)),
  };
};

const createFundUsageEntry = async ({ investorId, purchaseId, amount, entryType, reason, createdBy }) => {
  if (!investorId || !purchaseId || !amount || amount <= 0) return null;
  return InvestorFundUsageModel.create({
    investorId,
    purchaseId,
    amount: Number(amount),
    entryType,
    reason: reason || '',
    createdBy: createdBy || '',
  });
};

const createInvestmentShareFundUsageEntry = async ({
  investmentShareId,
  investorId,
  purchaseId,
  amount,
  entryType,
  reason,
  createdBy,
}) => {
  if (!investmentShareId || !purchaseId || !amount || amount <= 0) return null;
  return InvestmentShareFundUsageModel.create({
    investmentShareId,
    investorId: investorId || null,
    purchaseId,
    amount: Number(amount),
    entryType,
    reason: reason || '',
    createdBy: createdBy || '',
  });
};

const getInvestmentShareAvailableFunds = async (investmentShareId) => {
  const normalizedId = String(investmentShareId || '').trim();
  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) return 0;

  const share = await InvestmentShareModel.findById(normalizedId).select('totalInvestmentAmount');
  if (!share) return 0;

  const usageAgg = await InvestmentShareFundUsageModel.aggregate([
    { $match: { investmentShareId: new mongoose.Types.ObjectId(normalizedId) } },
    {
      $group: {
        _id: null,
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

  const debits = Number(usageAgg?.[0]?.debits || 0);
  const credits = Number(usageAgg?.[0]?.credits || 0);
  const total = Number(share.totalInvestmentAmount || 0);
  return Number(Math.max(total - debits + credits, 0).toFixed(2));
};

router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const quantityLitres = toNumber(req.body.quantityLitres);
    if (quantityLitres <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    const fundSource = String(req.body.fundSource || 'business_cash');
    const fundInvestorId = req.body.fundInvestorId || null;
    const fundAmountRaw =
      req.body.fundAmount !== undefined && req.body.fundAmount !== null && req.body.fundAmount !== ''
        ? req.body.fundAmount
        : req.body.netAmount;
    const fundAmount = toNumber(fundAmountRaw);
    const fundInvestmentShareId = req.body.fundInvestmentShareId || null;

    if (fundSource === 'investor_available') {
      if (!fundInvestorId || !mongoose.Types.ObjectId.isValid(String(fundInvestorId))) {
        return res.status(400).json({ message: 'Valid investor is required for investor available fund source' });
      }
      if (fundAmount <= 0) {
        return res.status(400).json({ message: 'Fund amount must be greater than zero' });
      }
      const investor = await InvestorModal.findById(fundInvestorId);
      if (!investor) {
        return res.status(400).json({ message: 'Selected investor not found' });
      }
      const available = await getInvestorAvailableFunds(fundInvestorId);
      if (fundAmount > available) {
        return res.status(400).json({
          message: `Insufficient investor available amount. Available: ${available}`,
        });
      }
    } else if (fundSource === 'investment_share') {
      if (!fundInvestmentShareId || !mongoose.Types.ObjectId.isValid(String(fundInvestmentShareId))) {
        return res.status(400).json({ message: 'Valid investment share is required for investment share fund source' });
      }
      if (fundAmount <= 0) {
        return res.status(400).json({ message: 'Fund amount must be greater than zero' });
      }
      const share = await InvestmentShareModel.findById(fundInvestmentShareId).select('investorId');
      if (!share) {
        return res.status(400).json({ message: 'Selected investment share not found' });
      }
      const available = await getInvestmentShareAvailableFunds(fundInvestmentShareId);
      if (fundAmount > available) {
        return res.status(400).json({
          message: `Insufficient investment share fund. Available: ${available}`,
        });
      }
    }

    const purchase = new Purchase({
      purchaseNo: req.body.purchaseNo,
      purchaseDate: req.body.purchaseDate,
      supplierName: req.body.supplierName,
      invoiceNo: req.body.invoiceNo,
      dieselType: req.body.dieselType,
      tankId: req.body.tankId,
      tankCode: req.body.tankCode,
      tankLocation: req.body.tankLocation,
      tankName: req.body.tankName,
      vehicleNo: req.body.vehicleNo,
      driverName: req.body.driverName,
      quantityLitres,
      ratePerLitre: req.body.ratePerLitre,
      discount: req.body.discount,
      freightCharges: req.body.freightCharges,
      taxPercent: req.body.taxPercent,
      grossAmount: req.body.grossAmount,
      taxableAmount: req.body.taxableAmount,
      taxAmount: req.body.taxAmount,
      netAmount: req.body.netAmount,
      paymentMode: req.body.paymentMode,
      fundSource,
      fundInvestorId: fundSource === 'investor_available' ? fundInvestorId : null,
      fundInvestmentShareId: fundSource === 'investment_share' ? fundInvestmentShareId : null,
      fundAmount: ['investor_available', 'investment_share'].includes(fundSource) ? fundAmount : 0,
      paymentStatus: req.body.paymentStatus,
      dueDate: req.body.dueDate,
      density: req.body.density,
      temperature: req.body.temperature,
      receivedBy: req.body.receivedBy,
      remarks: req.body.remarks,
      status: req.body.status,
      createdBy: req.body.createdBy,
    });

    await applyTankDelta(purchase.tankId, purchase.tankCode || purchase.tankName, quantityLitres);
    let newPurchase = null;
    try {
      newPurchase = await purchase.save();
      const impact = getPurchaseFundImpact(newPurchase);
      if (impact) {
        if (impact.source === 'investment_share') {
          const share = await InvestmentShareModel.findById(impact.investmentShareId).select('investorId');
          await createInvestmentShareFundUsageEntry({
            investmentShareId: impact.investmentShareId,
            investorId: share?.investorId || null,
            purchaseId: newPurchase._id,
            amount: impact.amount,
            entryType: 'debit',
            reason: 'Purchase payment',
            createdBy: req.body.createdBy || '',
          });
        } else {
          await createFundUsageEntry({
            investorId: impact.investorId,
            purchaseId: newPurchase._id,
            amount: impact.amount,
            entryType: 'debit',
            reason: 'Purchase payment',
            createdBy: req.body.createdBy || '',
          });
        }
      }
    } catch (error) {
      await applyTankDelta(purchase.tankId, purchase.tankCode || purchase.tankName, -quantityLitres);
      throw error;
    }
    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    const previousImpact = getPurchaseFundImpact(purchase);

    const prevQty = toNumber(purchase.quantityLitres);
    const prevTankId = purchase.tankId || '';
    const prevTankCode = purchase.tankCode || purchase.tankName || '';

    if (req.body.purchaseNo != null) purchase.purchaseNo = req.body.purchaseNo;
    if (req.body.purchaseDate != null) purchase.purchaseDate = req.body.purchaseDate;
    if (req.body.supplierName != null) purchase.supplierName = req.body.supplierName;
    if (req.body.invoiceNo != null) purchase.invoiceNo = req.body.invoiceNo;
    if (req.body.dieselType != null) purchase.dieselType = req.body.dieselType;
    if (req.body.tankId != null) purchase.tankId = req.body.tankId;
    if (req.body.tankCode != null) purchase.tankCode = req.body.tankCode;
    if (req.body.tankLocation != null) purchase.tankLocation = req.body.tankLocation;
    if (req.body.tankName != null) purchase.tankName = req.body.tankName;
    if (req.body.vehicleNo != null) purchase.vehicleNo = req.body.vehicleNo;
    if (req.body.driverName != null) purchase.driverName = req.body.driverName;
    if (req.body.quantityLitres != null) purchase.quantityLitres = toNumber(req.body.quantityLitres);
    if (req.body.ratePerLitre != null) purchase.ratePerLitre = req.body.ratePerLitre;
    if (req.body.discount != null) purchase.discount = req.body.discount;
    if (req.body.freightCharges != null) purchase.freightCharges = req.body.freightCharges;
    if (req.body.taxPercent != null) purchase.taxPercent = req.body.taxPercent;
    if (req.body.grossAmount != null) purchase.grossAmount = req.body.grossAmount;
    if (req.body.taxableAmount != null) purchase.taxableAmount = req.body.taxableAmount;
    if (req.body.taxAmount != null) purchase.taxAmount = req.body.taxAmount;
    if (req.body.netAmount != null) purchase.netAmount = req.body.netAmount;
    if (req.body.paymentMode != null) purchase.paymentMode = req.body.paymentMode;
    if (req.body.fundSource != null) purchase.fundSource = String(req.body.fundSource || 'business_cash');
    if (req.body.fundInvestorId !== undefined) purchase.fundInvestorId = req.body.fundInvestorId || null;
    if (req.body.fundInvestmentShareId !== undefined)
      purchase.fundInvestmentShareId = req.body.fundInvestmentShareId || null;
    if (req.body.fundAmount !== undefined) purchase.fundAmount = toNumber(req.body.fundAmount);
    if (String(purchase.fundSource || 'business_cash') !== 'investor_available') {
      purchase.fundInvestorId = null;
    }
    if (String(purchase.fundSource || 'business_cash') !== 'investment_share') {
      purchase.fundInvestmentShareId = null;
    }
    if (!['investor_available', 'investment_share'].includes(String(purchase.fundSource || 'business_cash'))) {
      purchase.fundAmount = 0;
    }
    if (req.body.paymentStatus != null) purchase.paymentStatus = req.body.paymentStatus;
    if (req.body.dueDate != null) purchase.dueDate = req.body.dueDate;
    if (req.body.density != null) purchase.density = req.body.density;
    if (req.body.temperature != null) purchase.temperature = req.body.temperature;
    if (req.body.receivedBy != null) purchase.receivedBy = req.body.receivedBy;
    if (req.body.remarks != null) purchase.remarks = req.body.remarks;
    if (req.body.status != null) purchase.status = req.body.status;
    if (req.body.createdBy != null) purchase.createdBy = req.body.createdBy;

    const nextQty = toNumber(purchase.quantityLitres);
    const nextTankId = purchase.tankId || '';
    const nextTankCode = purchase.tankCode || purchase.tankName || '';

    if (!nextQty || nextQty <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    const nextImpact = getPurchaseFundImpact({
      fundSource: purchase.fundSource,
      fundInvestorId: purchase.fundInvestorId,
      fundAmount:
        purchase.fundAmount !== undefined && purchase.fundAmount !== null && purchase.fundAmount !== ''
          ? purchase.fundAmount
          : purchase.netAmount,
      fundInvestmentShareId: purchase.fundInvestmentShareId,
      netAmount: purchase.netAmount,
    });

    if (nextImpact) {
      if (Number(nextImpact.amount || 0) <= 0) {
        return res.status(400).json({ message: 'Fund amount must be greater than zero' });
      }

      if (nextImpact.source === 'investment_share') {
        const share = await InvestmentShareModel.findById(nextImpact.investmentShareId).select('investorId');
        if (!share) {
          return res.status(400).json({ message: 'Selected investment share not found' });
        }

        let available = await getInvestmentShareAvailableFunds(nextImpact.investmentShareId);
        if (
          previousImpact &&
          previousImpact.source === 'investment_share' &&
          String(previousImpact.investmentShareId) === String(nextImpact.investmentShareId)
        ) {
          available += Number(previousImpact.amount || 0);
        }

        if (Number(nextImpact.amount || 0) > Number(available || 0)) {
          return res.status(400).json({
            message: `Insufficient investment share fund. Available: ${Number(available || 0).toFixed(2)}`,
          });
        }
      } else {
        const investor = await InvestorModal.findById(nextImpact.investorId);
        if (!investor) {
          return res.status(400).json({ message: 'Selected investor not found' });
        }

        let available = await getInvestorAvailableFunds(nextImpact.investorId);
        if (
          previousImpact &&
          previousImpact.source === 'investor_available' &&
          String(previousImpact.investorId) === String(nextImpact.investorId)
        ) {
          available += Number(previousImpact.amount || 0);
        }

        if (Number(nextImpact.amount || 0) > Number(available || 0)) {
          return res.status(400).json({
            message: `Insufficient investor available amount. Available: ${Number(available || 0).toFixed(2)}`,
          });
        }
      }
    }

    const sameTank = String(prevTankId || prevTankCode) === String(nextTankId || nextTankCode);
    if (sameTank) {
      const delta = nextQty - prevQty;
      if (delta !== 0) {
        await applyTankDelta(nextTankId, nextTankCode, delta);
      }
    } else {
      await applyTankDelta(prevTankId, prevTankCode, -prevQty);
      try {
        await applyTankDelta(nextTankId, nextTankCode, nextQty);
      } catch (error) {
        await applyTankDelta(prevTankId, prevTankCode, prevQty);
        throw error;
      }
    }

    const updatedPurchase = await purchase.save();

    const hasImpactChanged = (() => {
      if (!previousImpact && !nextImpact) return false;
      if (!previousImpact || !nextImpact) return true;
      return (
        String(previousImpact.source || '') !== String(nextImpact.source || '') ||
        String(previousImpact.investorId) !== String(nextImpact.investorId) ||
        String(previousImpact.investmentShareId) !== String(nextImpact.investmentShareId) ||
        Number(previousImpact.amount || 0) !== Number(nextImpact.amount || 0)
      );
    })();

    if (hasImpactChanged) {
      if (previousImpact) {
        if (previousImpact.source === 'investment_share') {
          const share = await InvestmentShareModel.findById(previousImpact.investmentShareId).select('investorId');
          await createInvestmentShareFundUsageEntry({
            investmentShareId: previousImpact.investmentShareId,
            investorId: share?.investorId || null,
            purchaseId: updatedPurchase._id,
            amount: previousImpact.amount,
            entryType: 'credit',
            reason: 'Purchase payment reversal (edit)',
            createdBy: req.body.createdBy || '',
          });
        } else {
          await createFundUsageEntry({
            investorId: previousImpact.investorId,
            purchaseId: updatedPurchase._id,
            amount: previousImpact.amount,
            entryType: 'credit',
            reason: 'Purchase payment reversal (edit)',
            createdBy: req.body.createdBy || '',
          });
        }
      }
      if (nextImpact) {
        if (nextImpact.source === 'investment_share') {
          const share = await InvestmentShareModel.findById(nextImpact.investmentShareId).select('investorId');
          await createInvestmentShareFundUsageEntry({
            investmentShareId: nextImpact.investmentShareId,
            investorId: share?.investorId || null,
            purchaseId: updatedPurchase._id,
            amount: nextImpact.amount,
            entryType: 'debit',
            reason: 'Purchase payment (edit)',
            createdBy: req.body.createdBy || '',
          });
        } else {
          await createFundUsageEntry({
            investorId: nextImpact.investorId,
            purchaseId: updatedPurchase._id,
            amount: nextImpact.amount,
            entryType: 'debit',
            reason: 'Purchase payment (edit)',
            createdBy: req.body.createdBy || '',
          });
        }
      }
    }

    res.json(updatedPurchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    const fundImpact = getPurchaseFundImpact(purchase);

    let stockAdjusted = false;
    let warning = '';
    const quantity = toNumber(purchase.quantityLitres);
    const tankId = purchase.tankId || '';
    const tankCode = purchase.tankCode || purchase.tankName || '';
    const tank = await resolveTank(tankId, tankCode);

    if (tank) {
      await applyTankDelta(tankId, tankCode, -quantity);
      stockAdjusted = true;
    } else {
      warning = 'Tank not found; purchase deleted without stock reversal';
    }

    try {
      await Purchase.findByIdAndDelete(req.params.id);
      if (fundImpact) {
        if (fundImpact.source === 'investment_share') {
          const share = await InvestmentShareModel.findById(fundImpact.investmentShareId).select('investorId');
          await createInvestmentShareFundUsageEntry({
            investmentShareId: fundImpact.investmentShareId,
            investorId: share?.investorId || null,
            purchaseId: purchase._id,
            amount: fundImpact.amount,
            entryType: 'credit',
            reason: 'Purchase deleted',
            createdBy: '',
          });
        } else {
          await createFundUsageEntry({
            investorId: fundImpact.investorId,
            purchaseId: purchase._id,
            amount: fundImpact.amount,
            entryType: 'credit',
            reason: 'Purchase deleted',
            createdBy: '',
          });
        }
      }
    } catch (error) {
      if (stockAdjusted) {
        await applyTankDelta(
          tankId,
          tankCode,
          quantity
        );
      }
      throw error;
    }
    res.json({
      message: 'Purchase deleted',
      warning,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
