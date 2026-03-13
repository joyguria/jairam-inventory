const express = require('express');
const router = express.Router();
const BusinessOrder = require('../models/businessOrder');

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
  return { quantityLitres, ratePerLitre, discount, taxPercent, grossAmount, taxableAmount, taxAmount, totalAmount };
};

router.get('/', async (req, res) => {
  try {
    const orders = await BusinessOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/agent/:agentId/summary', async (req, res) => {
  try {
    const agentId = String(req.params.agentId || '');
    const orders = await BusinessOrder.find({
      $or: [{ assignedAgentId: agentId }, { createdBy: agentId }],
    }).sort({ createdAt: -1 });

    const summary = {
      total: orders.length,
      pending: orders.filter((item) => item.status === 'Pending').length,
      approved: orders.filter((item) => item.status === 'Approved').length,
      dispatched: orders.filter((item) => item.status === 'Dispatched').length,
      completed: orders.filter((item) => item.status === 'Completed').length,
      cancelled: orders.filter((item) => item.status === 'Cancelled').length,
      list: orders.slice(0, 20),
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await BusinessOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const amounts = buildAmounts(req.body);
    const order = new BusinessOrder({
      orderNo: req.body.orderNo,
      orderDate: req.body.orderDate,
      deliveryDate: req.body.deliveryDate,
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
      paymentTerms: req.body.paymentTerms,
      status: req.body.status,
      assignedAgentId: req.body.assignedAgentId || '',
      assignedAgentName: req.body.assignedAgentName || '',
      remarks: req.body.remarks,
      saleId: req.body.saleId,
      createdBy: req.body.createdBy,
    });

    const created = await order.save();
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const order = await BusinessOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const amounts = buildAmounts(req.body);

    if (req.body.orderNo != null) order.orderNo = req.body.orderNo;
    if (req.body.orderDate != null) order.orderDate = req.body.orderDate;
    if (req.body.deliveryDate != null) order.deliveryDate = req.body.deliveryDate;
    if (req.body.customerId != null) order.customerId = req.body.customerId;
    if (req.body.customerCode != null) order.customerCode = req.body.customerCode;
    if (req.body.customerName != null) order.customerName = req.body.customerName;
    if (req.body.customerPhone != null) order.customerPhone = req.body.customerPhone;
    if (req.body.customerAddress != null) order.customerAddress = req.body.customerAddress;
    if (req.body.productId != null) order.productId = req.body.productId;
    if (req.body.productCode != null) order.productCode = req.body.productCode;
    if (req.body.productName != null) order.productName = req.body.productName;
    if (req.body.tankId != null) order.tankId = req.body.tankId;
    if (req.body.tankCode != null) order.tankCode = req.body.tankCode;
    if (req.body.tankLocation != null) order.tankLocation = req.body.tankLocation;
    if (req.body.availableStockLitres != null) order.availableStockLitres = toNumber(req.body.availableStockLitres);
    if (req.body.quantityLitres != null) order.quantityLitres = amounts.quantityLitres;
    if (req.body.ratePerLitre != null) order.ratePerLitre = amounts.ratePerLitre;
    if (req.body.discount != null) order.discount = amounts.discount;
    if (req.body.taxPercent != null) order.taxPercent = amounts.taxPercent;
    order.grossAmount = amounts.grossAmount;
    order.taxableAmount = amounts.taxableAmount;
    order.taxAmount = amounts.taxAmount;
    order.totalAmount = amounts.totalAmount;
    if (req.body.paymentTerms != null) order.paymentTerms = req.body.paymentTerms;
    if (req.body.status != null) order.status = req.body.status;
    if (req.body.assignedAgentId != null) order.assignedAgentId = req.body.assignedAgentId;
    if (req.body.assignedAgentName != null) order.assignedAgentName = req.body.assignedAgentName;
    if (req.body.remarks != null) order.remarks = req.body.remarks;
    if (req.body.saleId != null) order.saleId = req.body.saleId;
    if (req.body.createdBy != null) order.createdBy = req.body.createdBy;

    const updated = await order.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await BusinessOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
