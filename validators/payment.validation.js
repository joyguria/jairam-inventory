const Joi = require('joi');

const validatePayment = (data) => {
  const schema = Joi.object({
    // Reference to FuelTransaction
    fuelTransactionId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.length': 'Invalid Fuel Transaction ID format',
      }),

    // Amount checks
    amountPaid: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Payment amount must be greater than zero',
      }),

    // Date and Mode
    paymentDate: Joi.date()
      .default(() => new Date())
      .max('now'), // Prevents future-dated payments unless your business logic allows it

    paymentMode: Joi.string()
      .valid('rtgs', 'cash', 'upi', 'cheque', 'transfer')
      .required(),

    // Reference Info
    referenceNumber: Joi.string()
      .trim()
      .allow('')
      .max(50),

    transactionType: Joi.string()
      .valid('inbound', 'outbound')
      .required(),

    status: Joi.string()
      .valid('pending', 'completed', 'failed', 'refunded')
      .default('completed'),

    // User ID who recorded the payment
    recordedBy: Joi.string()
      .required()
      .messages({
        'any.required': 'The ID of the person recording this transaction is required',
      }),

    remarks: Joi.string()
      .trim()
      .max(500)
      .allow('', null)
  });
  return schema.validate(data, { abortEarly: true });
}

module.exports = { validatePayment };