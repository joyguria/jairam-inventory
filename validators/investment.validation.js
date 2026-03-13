const Joi = require('joi');

// Helper to validate MongoDB ObjectId strings
const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid ID');
  }
  return value;
};

const validateInvestment = (data) => {
  const schema = Joi.object({
    userId: Joi.string().custom(objectId).required(),
    
    amount: Joi.number().positive().required(),
    
    profitPerLiterPerDay: Joi.number().min(0).default(0),

    // Dates allow null and are optional
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().allow(null).greater(Joi.ref('startDate')).messages({
      'date.greater': 'End date must be after the start date'
    }),
    canWithdrawDate: Joi.date().allow(null).optional(),

    totalProfitEarned: Joi.number().min(0).default(0),
    
    paymentMode: Joi.string()
      .valid('Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash')
      .required()
      .default('RTGS')
      .messages({
          'any.only': 'Please select a valid payment mode (UPI, NetBanking, etc.)'
      }),

    status: Joi.string()
      .valid('Pending', 'Running', 'Completed', 'Withdraw')
      .default('Pending'),

    remarks: Joi.string().allow('').default(''),
  });

  return schema.validate(data, { abortEarly: false });
};

module.exports = { validateInvestment };