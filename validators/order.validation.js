const Joi = require('joi');

const validateOrder = (data) => {
    const schema = Joi.object({
        customerId: Joi.string().hex().length(24).required(),
        createdBy: Joi.string().hex().length(24).required(),
        orderNo: Joi.string().required(),
        
        quantity: Joi.number().positive().required().messages({
          'number.positive': 'Quantity must be more than zero',
          'any.required': 'Quantity is required to place an order'
        }),
        ratePerLitre: Joi.number().positive().required(),
        freightCharges: Joi.number().default(0),
        taxPercent: Joi.number().default(18),
        taxAmount: Joi.number().default(0),
        grossAmount: Joi.number().default(0),
        netAmount: Joi.number().default(0),
        paidAmount: Joi.number().min(0).default(0),

        paymentMode: Joi.string()
          .valid('Cheque', 'UPI', 'NetBanking', 'NEFT', 'RTGS', 'Cash', 'N/A')
          .when('paymentStatus', {
            is: Joi.string().valid('Partial', 'Paid'),
            then: Joi.required(),
            otherwise: Joi.string().valid('N/A').default('N/A')
          }),

        paymentStatus: Joi.string()
          .valid('Unpaid', 'Partial', 'Paid')
          .default('Paid'),

        orderDate: Joi.date().required(),
        orderStatus: Joi.string().valid('Pending', 'Confirmed', 'Delivered', 'Cancelled').default('Pending'),
        
        // Conditional Validations
        driver: Joi.string().trim().when('orderStatus', {
            is: 'Confirmed',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),

        vehicle: Joi.string().trim().when('orderStatus', {
            is: 'Confirmed',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),

        confirmDate: Joi.date().when('orderStatus', {
            is: 'Confirmed',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),

        deliveryDate: Joi.date().when('orderStatus', {
            is: 'Delivered',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),

        cancelledDate: Joi.date().when('orderStatus', {
            is: 'Cancelled',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        remarks: Joi.string().allow('').optional()
    });
  return schema.validate(data, { abortEarly: false });
}

module.exports = { validateOrder };