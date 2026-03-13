const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Delivery = require('../models/delivery');
const Driver = require('../models/driver');
const BusinessSale = require('../models/businessSale');
const { Counter } = require('../models/counter');

const getNextDeliveryNo = async () => {
  for (let i = 0; i < 20; i += 1) {
    const counter = await Counter.findByIdAndUpdate(
      'deliveryNo',
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const deliveryNo = `DLV${String(counter.seq).padStart(5, '0')}`;
    const alreadyExists = await Delivery.exists({ deliveryNo });
    if (!alreadyExists) return deliveryNo;
  }
  throw new Error('Unable to generate unique delivery number');
};

const updateDriverStatus = async (driverId, status) => {
  if (!driverId) return;
  const driver = await Driver.findById(driverId);
  if (!driver) return;
  driver.status = status;
  await driver.save();
};

router.get('/', async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/driver/:driverId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.driverId)) {
      return res.status(400).json({ message: 'Invalid driverId' });
    }
    const status = String(req.query.status || '').trim();
    const query = { driverId: req.params.driverId };
    if (status) query.status = status;
    const deliveries = await Delivery.find(query).sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/employee/:employeeId/summary', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.employeeId)) {
      return res.status(400).json({ message: 'Invalid employeeId' });
    }
    const employeeId = req.params.employeeId;
    const deliveries = await Delivery.find({
      $or: [{ supportEmployeeId: employeeId }, { createdBy: employeeId }],
    }).sort({ createdAt: -1 });

    const summary = {
      total: deliveries.length,
      assigned: deliveries.filter((item) => item.supportStatus === 'Assigned').length,
      inProgress: deliveries.filter((item) => item.supportStatus === 'In Progress').length,
      completed: deliveries.filter((item) => item.supportStatus === 'Completed').length,
      delivered: deliveries.filter((item) => item.status === 'Delivered').length,
      list: deliveries.slice(0, 20),
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const sale = await BusinessSale.findById(req.body.saleId);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const driver = await Driver.findById(req.body.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    let deliveryNo = String(req.body.deliveryNo || '').trim();
    if (!deliveryNo || (await Delivery.exists({ deliveryNo }))) {
      deliveryNo = await getNextDeliveryNo();
    }

    const alertMessage = `Delivery assigned: ${sale.saleNo || '-'} | Customer: ${sale.customerName || '-'} | Qty: ${sale.quantityLitres || 0} L`;

    const payload = {
      deliveryNo,
      saleId: String(sale._id),
      saleNo: sale.saleNo || '',
      invoiceNo: sale.invoiceNo || '',
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      deliveryAddress: req.body.deliveryAddress || sale.deliveryAddress || sale.customerAddress || '',
      productName: sale.productName || '',
      quantityLitres: Number(sale.quantityLitres) || 0,
      driverId: driver._id,
      driverCode: driver.code || '',
      driverName: driver.name || '',
      driverPhone: driver.phone || '',
      supportEmployeeId:
        req.body.supportEmployeeId && mongoose.Types.ObjectId.isValid(req.body.supportEmployeeId)
          ? req.body.supportEmployeeId
          : null,
      supportEmployeeName: req.body.supportEmployeeName || '',
      supportStatus:
        req.body.supportEmployeeId && mongoose.Types.ObjectId.isValid(req.body.supportEmployeeId)
          ? 'Assigned'
          : 'Unassigned',
      vehicleNo: req.body.vehicleNo || sale.vehicleNo || '',
      assignedAt: new Date(),
      status: 'Assigned',
      alertSent: true,
      alertMessage,
      remarks: req.body.remarks || '',
      createdBy: req.body.createdBy || 'admin',
    };

    const delivery = await Delivery.create(payload);
    sale.status = 'Invoiced';
    await sale.save();
    await updateDriverStatus(String(driver._id), 'On Trip');

    const io = req.app.get('io');
    if (io) {
      io.to(`driver:${String(driver._id)}`).emit('delivery:assigned', {
        deliveryId: String(delivery._id),
        saleNo: payload.saleNo,
        customerName: payload.customerName,
        quantityLitres: payload.quantityLitres,
        deliveryAddress: payload.deliveryAddress,
      });
      io.emit('delivery:assigned', {
        driverId: String(driver._id),
        deliveryId: String(delivery._id),
      });
    }

    res.status(201).json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    const prevDriverId = delivery.driverId;

    if (req.body.driverId && String(req.body.driverId) !== String(delivery.driverId)) {
      const driver = await Driver.findById(req.body.driverId);
      if (!driver) return res.status(404).json({ message: 'Driver not found' });
      delivery.driverId = driver._id;
      delivery.driverCode = driver.code || '';
      delivery.driverName = driver.name || '';
      delivery.driverPhone = driver.phone || '';
      delivery.alertSent = true;
      delivery.alertMessage = `Delivery reassigned to ${driver.name}`;
      await updateDriverStatus(String(driver._id), 'On Trip');
      if (prevDriverId && String(prevDriverId) !== String(driver._id)) {
        await updateDriverStatus(String(prevDriverId), 'Available');
      }
    }

    if (req.body.deliveryAddress != null) delivery.deliveryAddress = req.body.deliveryAddress;
    if (req.body.vehicleNo != null) delivery.vehicleNo = req.body.vehicleNo;
    if (req.body.supportEmployeeId != null) {
      delivery.supportEmployeeId =
        req.body.supportEmployeeId && mongoose.Types.ObjectId.isValid(req.body.supportEmployeeId)
          ? req.body.supportEmployeeId
          : null;
    }
    if (req.body.supportEmployeeName != null) delivery.supportEmployeeName = req.body.supportEmployeeName;
    if (req.body.supportStatus != null) delivery.supportStatus = req.body.supportStatus;
    if (req.body.remarks != null) delivery.remarks = req.body.remarks;
    if (req.body.status != null) delivery.status = req.body.status;

    if (delivery.status === 'Delivered') {
      delivery.deliveredAt = new Date();
      const sale = await BusinessSale.findById(delivery.saleId);
      if (sale) {
        sale.status = 'Delivered';
        await sale.save();
      }
      await updateDriverStatus(String(delivery.driverId), 'Available');
    } else if (delivery.status === 'In Transit' || delivery.status === 'Assigned') {
      await updateDriverStatus(String(delivery.driverId), 'On Trip');
    } else if (delivery.status === 'Cancelled') {
      await updateDriverStatus(String(delivery.driverId), 'Available');
    }

    const updated = await delivery.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    const status = String(req.body.status || '').trim();
    if (!['Assigned', 'In Transit', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    delivery.status = status;
    if (status === 'Delivered') {
      delivery.deliveredAt = new Date();
      const sale = await BusinessSale.findById(delivery.saleId);
      if (sale) {
        sale.status = 'Delivered';
        await sale.save();
      }
      await updateDriverStatus(String(delivery.driverId), 'Available');
    } else if (status === 'In Transit' || status === 'Assigned') {
      await updateDriverStatus(String(delivery.driverId), 'On Trip');
    } else if (status === 'Cancelled') {
      await updateDriverStatus(String(delivery.driverId), 'Available');
    }

    const updated = await delivery.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('delivery:status-updated', {
        deliveryId: String(updated._id),
        status: updated.status,
        driverId: String(updated.driverId),
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    await updateDriverStatus(String(delivery.driverId), 'Available');
    await Delivery.findByIdAndDelete(req.params.id);
    res.json({ message: 'Delivery deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
