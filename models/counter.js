const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  },
  seq: { 
    type: Number, 
    default: 0 
  }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
module.exports = Counter;

// const orderCounterSchema = new mongoose.Schema({
//   date: { type: String, required: true, unique: true }, // Format: YYMMDD
//   seq: { type: Number, default: 0 }
// });
// exports.OrderCounter = mongoose.model('OrderCounter', orderCounterSchema);
