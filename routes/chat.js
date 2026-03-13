const express = require('express');
const mongoose = require('mongoose');
const { ChatMessageModel } = require('../models/chatMessage');
const { InvestorModal } = require('../models/investor');
const { AdminModal } = require('../models/admin');

const router = express.Router();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const roomFor = (userType, userId) => `chat:${userType}:${String(userId)}`;

const normalizeMessage = (doc) => ({
  id: String(doc.id || doc._id),
  senderType: doc.senderType,
  senderId: String(doc.senderId),
  receiverType: doc.receiverType,
  receiverId: String(doc.receiverId),
  text: doc.text,
  readByReceiver: Boolean(doc.readByReceiver),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

router.get('/admins', async (req, res) => {
  try {
    const admins = await AdminModal.find({}, 'name email').sort({ name: 1 }).lean();
    return res.send(
      admins.map((item) => ({
        id: String(item._id),
        name: item.name || 'Admin',
        email: item.email || '',
      }))
    );
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to load admin list' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const { userType, userId } = req.query;
    if (!['admin', 'investor'].includes(String(userType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid userType' });
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, msg: 'Invalid userId' });
    }

    const count = await ChatMessageModel.countDocuments({
      receiverType: userType,
      receiverId: userId,
      readByReceiver: false,
    });

    return res.send({ count });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to load unread count' });
  }
});

router.get('/presence', async (req, res) => {
  try {
    const { userType, userIds } = req.query;
    if (!['admin', 'investor'].includes(String(userType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid userType' });
    }
    const ids = String(userIds || '')
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    const onlineUserCounts = req.app.get('onlineUserCounts') || new Map();
    const status = {};
    ids.forEach((id) => {
      const key = `${userType}:${id}`;
      status[id] = Number(onlineUserCounts.get(key) || 0) > 0;
    });

    return res.send({ status });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to load presence' });
  }
});

router.get('/admin/conversations', async (req, res) => {
  try {
    const { adminId } = req.query;
    const hasValidAdminId = isValidObjectId(adminId);

    const investors = await InvestorModal.find({}, 'name email investorCode').sort({ name: 1 }).lean();
    const chatMessages = hasValidAdminId
      ? await ChatMessageModel.find({
          $or: [
            { senderType: 'admin', senderId: adminId, receiverType: 'investor' },
            { senderType: 'investor', receiverType: 'admin', receiverId: adminId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const conversationMap = new Map();
    for (const msg of chatMessages) {
      const investorId =
        msg.senderType === 'investor' ? String(msg.senderId) : String(msg.receiverId);
      if (!conversationMap.has(investorId)) {
        conversationMap.set(investorId, {
          lastMessage: msg.text || '',
          lastMessageAt: msg.createdAt || null,
          unreadCount: 0,
        });
      }
      if (msg.senderType === 'investor' && msg.receiverType === 'admin' && !msg.readByReceiver) {
        const prev = conversationMap.get(investorId);
        prev.unreadCount += 1;
      }
    }

    const list = investors
      .map((inv) => {
        const investorId = String(inv._id);
        const meta = conversationMap.get(investorId) || {};
        return {
          investorId,
          name: inv.name || 'Investor',
          email: inv.email || '',
          investorCode: inv.investorCode || '',
          lastMessage: meta.lastMessage || '',
          lastMessageAt: meta.lastMessageAt || null,
          unreadCount: meta.unreadCount || 0,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

    return res.send(list);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to load conversations' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const { userType, userId, peerType, peerId } = req.query;
    if (!['admin', 'investor'].includes(String(userType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid userType' });
    }
    if (!['admin', 'investor'].includes(String(peerType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid peerType' });
    }
    if (!isValidObjectId(userId) || !isValidObjectId(peerId)) {
      return res.status(400).json({ success: false, msg: 'Invalid userId or peerId' });
    }

    const messages = await ChatMessageModel.find({
      $or: [
        { senderType: userType, senderId: userId, receiverType: peerType, receiverId: peerId },
        { senderType: peerType, senderId: peerId, receiverType: userType, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    return res.send(messages.map(normalizeMessage));
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to load messages' });
  }
});

router.put('/read', async (req, res) => {
  try {
    const { userType, userId, peerType, peerId } = req.body || {};
    if (!['admin', 'investor'].includes(String(userType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid userType' });
    }
    if (!['admin', 'investor'].includes(String(peerType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid peerType' });
    }
    if (!isValidObjectId(userId) || !isValidObjectId(peerId)) {
      return res.status(400).json({ success: false, msg: 'Invalid userId or peerId' });
    }

    const result = await ChatMessageModel.updateMany(
      {
        senderType: peerType,
        senderId: peerId,
        receiverType: userType,
        receiverId: userId,
        readByReceiver: false,
      },
      { $set: { readByReceiver: true } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(roomFor(userType, userId)).to(roomFor(peerType, peerId)).emit('chat:read', {
        userType,
        userId: String(userId),
        peerType,
        peerId: String(peerId),
      });
    }

    return res.send({ modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to mark messages as read' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { senderType, senderId, receiverType, receiverId, text } = req.body || {};
    if (!['admin', 'investor'].includes(String(senderType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid senderType' });
    }
    if (!['admin', 'investor'].includes(String(receiverType || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid receiverType' });
    }
    if (!isValidObjectId(senderId) || !isValidObjectId(receiverId)) {
      return res.status(400).json({ success: false, msg: 'Invalid senderId or receiverId' });
    }
    const cleanText = String(text || '').trim();
    if (!cleanText) {
      return res.status(400).json({ success: false, msg: 'Message cannot be empty' });
    }

    const created = await ChatMessageModel.create({
      senderType,
      senderId,
      receiverType,
      receiverId,
      text: cleanText,
      readByReceiver: false,
    });

    const payload = normalizeMessage(created.toJSON());
    const io = req.app.get('io');
    if (io) {
      io.to(roomFor(senderType, senderId)).to(roomFor(receiverType, receiverId)).emit('chat:new', payload);
    }

    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({ success: false, msg: 'Failed to send message' });
  }
});

module.exports = router;
