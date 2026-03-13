const Joi = require('joi');

const validateCustomer = (data) => {
  const schema = Joi.object({    
    createdBy: Joi.string()
      .hex()
      .length(24)
      .when('$isUpdate', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required()
      }),

    code: Joi.string().allow('', null),

    name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required(),

    customerType: Joi.string()
      .valid('Retail', 'Wholesale', 'Industrial', 'General')
      .required()
      .default('Retail'),

    email: Joi.string()
      .email() // Validates standard email format
      .lowercase()
      .trim()
      .required(),

    phone: Joi.string()
      .trim()
      .pattern(/^[0-9+\-\s()]*$/) // Allows numbers and common phone symbols
      .min(10)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number.'
      }),

    landmark: Joi.string()
      .trim()
      .required(),

    city: Joi.string()
      .trim()
      .required(),

    state: Joi.string()
      .trim()
      .required(),

    country: Joi.string()
      .trim()
      .required(),  

    status: Joi.string()
      .valid('Active', 'Inactive')
      .default('Active')
  });

  return schema.validate(data, { abortEarly: true });
};

module.exports = { validateCustomer }