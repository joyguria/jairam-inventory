const Joi = require('joi');

const validateSupplier = (data) => {
  const schema = Joi.object({
    createdBy: Joi.string().hex().length(24).required(),
    code: Joi.string()
      .trim()
      .required()
      .messages({ 'any.required': 'Supplier code is mandatory' }),

    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required(),

    contactPerson: Joi.string()
      .trim()
      .required(),

    email: Joi.string()
      .email() // Validates actual email format
      .lowercase()
      .trim()
      .required(),

    phone: Joi.string()
      .trim()
      .pattern(/^[0-9+\- ]+$/) // Allows numbers, +, -, and spaces
      .required()
      .messages({ 'string.pattern.base': 'Phone number contains invalid characters' }),

    tinNo: Joi.string()
      .trim()
      .required(),

    status: Joi.string()
      .valid('Active', 'Inactive')
      .default('Active'),
  });

  return schema.validate(data);

  // return schema.validate(data, { abortEarly: false }); // Returns all errors, not just the first
};

module.exports = { validateSupplier };