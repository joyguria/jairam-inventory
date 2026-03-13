const express = require('express');
const bcrypt = require('bcrypt');
const Agent = require('../models/agent');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.password || !String(req.body.password).trim()) {
      return res.status(400).json({ message: 'Password is required for agent account' });
    }

    const hashedPassword = await bcrypt.hash(String(req.body.password).trim(), 10);
    const agent = new Agent({
      code: req.body.code,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      status: req.body.status,
      createdBy: req.body.createdBy,
    });

    const created = await agent.save();
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000) {
      const duplicateKey = Object.keys(err?.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (req.body.code != null) agent.code = req.body.code;
    if (req.body.name != null) agent.name = req.body.name;
    if (req.body.email != null) agent.email = req.body.email;
    if (req.body.phone != null) agent.phone = req.body.phone;
    if (req.body.password != null && String(req.body.password).trim()) {
      agent.password = await bcrypt.hash(String(req.body.password).trim(), 10);
    }
    if (req.body.status != null) agent.status = req.body.status;
    if (req.body.createdBy != null) agent.createdBy = req.body.createdBy;

    const updated = await agent.save();
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      const duplicateKey = Object.keys(err?.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${duplicateKey} already exists` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Agent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
