const Joi = require('joi');

const validateTank = (data) => {
  const schema = Joi.object({
    code: Joi.string()
      .uppercase()
      .required()
      .messages({
        'any.required': 'Tank code is mandatory',
        'string.empty': 'Tank code cannot be empty'
      }),
      
    name: Joi.string().min(3).max(100).required(),

    landmark: Joi.string().required(),
    
    city: Joi.string().required(),

    state: Joi.string().required(),

    country: Joi.string().required(),

    capacity: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Capacity must be greater than 0'
      }),
      
    reservedStock: Joi.number()
      .min(0)
      .default(0),

    pendingStock: Joi.number()
      .min(0)
      .default(0),

    availableStock: Joi.number()
      .min(0)
      .default(0),
      
    status: Joi.string()
      .valid('Active', 'Inactive', 'Maintenance')
      .default('Active')
  });

  return schema.validate(data);
};

module.exports = { validateTank };

