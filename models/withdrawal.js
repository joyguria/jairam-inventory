const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: [100, 'Minimum withdrawal is ₹100'] 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'], 
    default: 'Pending' 
  },
  notes: String,
  actionDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // 'this' refers to the document
        // If status is NOT 'Pending', value must exist
        if (this.status !== 'Pending') {
          return value instanceof Date && !isNaN(value);
        }
        return true;
      },
      message: 'actionDate is required when status is not Pending'
    }
  }
}, { timestamps: true });

// const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', withdrawalSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;