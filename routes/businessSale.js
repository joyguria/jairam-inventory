const express = require('express');
const router = express.Router();
const BusinessSale = require('../models/businessSale');
const Tank = require('../models/tank');
const { Counter } = require('../models/counter');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildAmounts = (payload) => {
  const quantityLitres = toNumber(payload.quantityLitres);
  const ratePerLitre = toNumber(payload.ratePerLitre);
  const discount = toNumber(payload.discount);
  const taxPercent = toNumber(payload.taxPercent);
  const grossAmount = quantityLitres * ratePerLitre;
  const taxableAmount = Math.max(grossAmount - discount, 0);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const totalAmount = taxableAmount + taxAmount;
  const receivedAmount = toNumber(payload.receivedAmount);
  const balanceAmount = Math.max(totalAmount - receivedAmount, 0);
  return {
    quantityLitres,
    ratePerLitre,
    discount,
    taxPercent,
    grossAmount,
    taxableAmount,
    taxAmount,
    totalAmount,
    receivedAmount,
    balanceAmount,
  };
};

const getNextSaleNo = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'businessSaleNo',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const saleNo = `SAL${String(counter.seq).padStart(5, '0')}`;
    const alreadyExists = await BusinessSale.exists({ saleNo });
    if (!alreadyExists) return saleNo;
  }
  throw new Error('Unable to generate unique sale number');
};

const getNextInvoiceNo = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'businessSaleInvoiceNo',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const invoiceNo = `INV${String(counter.seq).padStart(6, '0')}`;
    const alreadyExists = await BusinessSale.exists({ invoiceNo });
    if (!alreadyExists) return invoiceNo;
  }
  throw new Error('Unable to generate unique invoice number');
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
  if (!tank) throw new Error('Selected tank not found');

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

const ensureSufficientTankStockForSale = async (tankId, tankCode, saleQtyLitres) => {
  const qty = toNumber(saleQtyLitres);
  if (qty <= 0) return;

  const tank = await resolveTank(tankId, tankCode);
  if (!tank) throw new Error('Selected tank not found');

  const currentStock = toNumber(tank.currentStock);
  const reservedStock = toNumber(tank.reservedStock);
  const availableForSale = Math.max(currentStock - reservedStock, 0);
  if (qty > availableForSale) {
    throw new Error(
      `Sale quantity (${qty} L) exceeds available diesel (${availableForSale} L) in tank ${tank.code}`
    );
  }
};

router.get('/', async (req, res) => {
  try {
    const sales = await BusinessSale.find().sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await BusinessSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const amounts = buildAmounts(req.body);
    if (amounts.quantityLitres <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }
    let saleNo = String(req.body.saleNo || '').trim();
    let invoiceNo = String(req.body.invoiceNo || '').trim();

    if (!saleNo || (await BusinessSale.exists({ saleNo }))) {
      saleNo = await getNextSaleNo();
    }
    if (!invoiceNo || (await BusinessSale.exists({ invoiceNo }))) {
      invoiceNo = await getNextInvoiceNo();
    }

    await ensureSufficientTankStockForSale(req.body.tankId, req.body.tankCode, amounts.quantityLitres);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await applyTankDelta(req.body.tankId, req.body.tankCode, -amounts.quantityLitres);
      const sale = new BusinessSale({
        saleNo,
        saleDate: req.body.saleDate,
        invoiceNo,
        orderId: req.body.orderId,
        customerId: req.body.customerId,
        customerCode: req.body.customerCode,
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        customerAddress: req.body.customerAddress,
        productId: req.body.productId,
        productCode: req.body.productCode,
        productName: req.body.productName,
        tankId: req.body.tankId,
        tankCode: req.body.tankCode,
        tankLocation: req.body.tankLocation,
        availableStockLitres: toNumber(req.body.availableStockLitres),
        quantityLitres: amounts.quantityLitres,
        ratePerLitre: amounts.ratePerLitre,
        discount: amounts.discount,
        taxPercent: amounts.taxPercent,
        grossAmount: amounts.grossAmount,
        taxableAmount: amounts.taxableAmount,
        taxAmount: amounts.taxAmount,
        totalAmount: amounts.totalAmount,
        paymentMode: req.body.paymentMode,
        paymentStatus: req.body.paymentStatus,
        receivedAmount: amounts.receivedAmount,
        balanceAmount: amounts.balanceAmount,
        deliveryAddress: req.body.deliveryAddress,
        vehicleNo: req.body.vehicleNo,
        driverName: req.body.driverName,
        status: req.body.status,
        remarks: req.body.remarks,
        createdBy: req.body.createdBy,
      });

      try {
        const created = await sale.save();
        return res.status(201).json(created);
      } catch (err) {
        await applyTankDelta(req.body.tankId, req.body.tankCode, amounts.quantityLitres);
        if (err?.code !== 11000) throw err;
        const duplicateKeys = Object.keys(err?.keyPattern || {});
        if (duplicateKeys.includes('saleNo')) {
          saleNo = await getNextSaleNo();
        }
        if (duplicateKeys.includes('invoiceNo')) {
          invoiceNo = await getNextInvoiceNo();
        }
      }
    }

    return res.status(409).json({ message: 'Unable to generate unique sale number/invoice number' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const sale = await BusinessSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const amounts = buildAmounts(req.body);
    if (amounts.quantityLitres <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    const prevQty = toNumber(sale.quantityLitres);
    const prevTankId = sale.tankId || '';
    const prevTankCode = sale.tankCode || '';

    if (req.body.saleNo != null) sale.saleNo = req.body.saleNo;
    if (req.body.saleDate != null) sale.saleDate = req.body.saleDate;
    if (req.body.invoiceNo != null) sale.invoiceNo = req.body.invoiceNo;
    if (req.body.orderId != null) sale.orderId = req.body.orderId;
    if (req.body.customerId != null) sale.customerId = req.body.customerId;
    if (req.body.customerCode != null) sale.customerCode = req.body.customerCode;
    if (req.body.customerName != null) sale.customerName = req.body.customerName;
    if (req.body.customerPhone != null) sale.customerPhone = req.body.customerPhone;
    if (req.body.customerAddress != null) sale.customerAddress = req.body.customerAddress;
    if (req.body.productId != null) sale.productId = req.body.productId;
    if (req.body.productCode != null) sale.productCode = req.body.productCode;
    if (req.body.productName != null) sale.productName = req.body.productName;
    if (req.body.tankId != null) sale.tankId = req.body.tankId;
    if (req.body.tankCode != null) sale.tankCode = req.body.tankCode;
    if (req.body.tankLocation != null) sale.tankLocation = req.body.tankLocation;
    if (req.body.availableStockLitres != null) sale.availableStockLitres = toNumber(req.body.availableStockLitres);
    if (req.body.quantityLitres != null) sale.quantityLitres = amounts.quantityLitres;
    if (req.body.ratePerLitre != null) sale.ratePerLitre = amounts.ratePerLitre;
    if (req.body.discount != null) sale.discount = amounts.discount;
    if (req.body.taxPercent != null) sale.taxPercent = amounts.taxPercent;
    sale.grossAmount = amounts.grossAmount;
    sale.taxableAmount = amounts.taxableAmount;
    sale.taxAmount = amounts.taxAmount;
    sale.totalAmount = amounts.totalAmount;
    if (req.body.paymentMode != null) sale.paymentMode = req.body.paymentMode;
    if (req.body.paymentStatus != null) sale.paymentStatus = req.body.paymentStatus;
    if (req.body.receivedAmount != null) sale.receivedAmount = amounts.receivedAmount;
    sale.balanceAmount = amounts.balanceAmount;
    if (req.body.deliveryAddress != null) sale.deliveryAddress = req.body.deliveryAddress;
    if (req.body.vehicleNo != null) sale.vehicleNo = req.body.vehicleNo;
    if (req.body.driverName != null) sale.driverName = req.body.driverName;
    if (req.body.status != null) sale.status = req.body.status;
    if (req.body.remarks != null) sale.remarks = req.body.remarks;
    if (req.body.createdBy != null) sale.createdBy = req.body.createdBy;

    const nextQty = toNumber(sale.quantityLitres);
    const nextTankId = sale.tankId || '';
    const nextTankCode = sale.tankCode || '';
    const sameTank = String(prevTankId || prevTankCode) === String(nextTankId || nextTankCode);

    if (sameTank) {
      const deltaForSale = nextQty - prevQty;
      if (deltaForSale > 0) {
        await ensureSufficientTankStockForSale(nextTankId, nextTankCode, deltaForSale);
      }
    } else {
      await ensureSufficientTankStockForSale(nextTankId, nextTankCode, nextQty);
    }

    if (sameTank) {
      const delta = prevQty - nextQty;
      if (delta !== 0) {
        await applyTankDelta(nextTankId, nextTankCode, delta);
      }
    } else {
      await applyTankDelta(prevTankId, prevTankCode, prevQty);
      try {
        await applyTankDelta(nextTankId, nextTankCode, -nextQty);
      } catch (error) {
        await applyTankDelta(prevTankId, prevTankCode, -prevQty);
        throw error;
      }
    }

    const updated = await sale.save();
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      const duplicateKeys = Object.keys(err?.keyPattern || {});
      if (duplicateKeys.includes('saleNo')) {
        return res.status(409).json({ message: 'Sale No already exists. Please refresh and try again.' });
      }
      if (duplicateKeys.includes('invoiceNo')) {
        return res.status(409).json({ message: 'Invoice No already exists. Please refresh and try again.' });
      }
      return res.status(409).json({ message: 'Duplicate value found.' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sale = await BusinessSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    await applyTankDelta(sale.tankId || '', sale.tankCode || '', toNumber(sale.quantityLitres));
    try {
      await BusinessSale.findByIdAndDelete(req.params.id);
    } catch (error) {
      await applyTankDelta(sale.tankId || '', sale.tankCode || '', -toNumber(sale.quantityLitres));
      throw error;
    }
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
