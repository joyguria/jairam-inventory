const mongoose = require('mongoose');

const chatMessageSchema = mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ['admin', 'investor'],
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    receiverType: {
      type: String,
      enum: ['admin', 'investor'],
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readByReceiver: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

chatMessageSchema.virtual('id').get(function getId() {
  return this._id.toHexString();
});

chatMessageSchema.set('toJSON', { virtuals: true });

exports.ChatMessageModel = mongoose.model('ChatMessage', chatMessageSchema);
exports.chatMessageSchema = chatMessageSchema;
