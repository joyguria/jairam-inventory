const Joi = require('joi');

// Helper for MongoDB ObjectIds
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format');

const validatePurchase = (data) => {
  const schema = Joi.object({
    tankId: objectId.required(),
    supplierId: objectId.required(),
    createdBy: objectId.required(),

    // receivedBy is required ONLY if status is 'Completed'
    receivedBy: objectId.when('purchaseStatus', {
      is: 'Completed',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),

    purchaseNo: Joi.string()
      .trim()
      .required(),

    quantity: Joi.number().min(0).required(),
    density: Joi.number().default(0),
    ratePerLitre: Joi.number().positive().required(),
    discountPercent: Joi.number().min(0).default(0),
    discountAmount: Joi.number().min(0).default(0),
    freightCharges: Joi.number().default(0),
    taxPercent: Joi.number().default(18),
    taxAmount: Joi.number().default(0),
    grossAmount: Joi.number().default(0),
    netAmount: Joi.number().default(0),
    paidAmount: Joi.number().min(0).default(0),

    purchaseDate: Joi.date().default(() => new Date()),

    receivedDate: Joi.date().when('status', {
      is: 'Completed',
      // You must re-declare Joi.date() here to access .min()
      then: Joi.date().required().min(Joi.ref('purchaseDate')).messages({
        'date.min': 'Received date cannot be earlier than the purchase date',
        'any.required': 'Received date is required when status is Completed'
      }),
      otherwise: Joi.date().optional().allow(null, '')
    }),

    paymentMode: Joi.string()      
      .valid('Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash')
      .default('RTGS'),

    paymentStatus: Joi.string()
      .valid('Unpaid', 'Partial', 'Paid')
      .default('Paid'),

    purchaseStatus: Joi.string()
      .valid('Pending', 'Completed', 'Cancelled')
      .default('Pending'),

    remarks: Joi.string().trim().allow('').default('')

  });
  return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

module.exports = { validatePurchase };