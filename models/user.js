const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['SuperAdmin', 'Admin', 'Investor', 'Driver', 'Agent', 'Employee'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    emailVerified: {
      type: Boolean,
      required: true,      
      default: false
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      default: '',
    },
    otpCode: {
      type: Number,
      trim: true,      
    },
    policyStatus: {
      type: String,
      enum: ['Pending', 'Agree'],
      default: 'Pending',  
      required: false    
    },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Inactive'],
      default: 'Pending',
      trim: true,
    },
    createdBy: {
      type: String,
      default: '',
      trim: true,
    },
    walletBalance: { type: Number, default: 0 },
  },
  {
    collection: 'users',
    discriminatorKey: 'role',
    timestamps: true,
  }
);

// Role-scoped uniqueness for role-specific identifiers on the shared users collection.
userSchema.index(
  { role: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      code: { $exists: true, $type: 'string' },
    },
  }
);

userSchema.index(
  { role: 1, investorCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      investorCode: { $exists: true, $type: 'string' },
    },
  }
);

userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Add this to your userSchema definition
userSchema.virtual('address', {
  ref: 'Address',      // The model to use
  localField: '_id',   // Find people where `localField`
  foreignField: 'userId', // is equal to `foreignField`
  justOne: true        // Address is usually 1-to-1
});

userSchema.virtual('bank', {
  ref: 'Bank',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Ensure virtuals are included when converting to JSON/Object
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const getDiscriminator = (name, schema, value) => {
  if (mongoose.models[name]) return mongoose.models[name];
  return User.discriminator(name, schema, value);
};
// const Investor = User.discriminator('Investor', new mongoose.Schema({
//   policyStatus: {
//     type: String,
//     enum: ['Pending', 'Agree'],
//     default: 'Pending',
//   }
// }));

module.exports = {
  User,
  userSchema,
  getDiscriminator,
};
