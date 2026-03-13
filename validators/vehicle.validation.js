const Joi = require('joi');

const validateVehicle = (data) => {
  const schema = Joi.object({
    vehicleNo: Joi.string()
      .uppercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Vehicle number is required',
        'any.required': 'Vehicle number is required'
      }),
    
    vehicleName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required(),

    status: Joi.string()
      .valid('Running', 'On Trip', 'Parked')
      .default('Running'),

    createdBy: Joi.string().required()
  });

  return schema.validate(data, { abortEarly: true });
};

module.exports = { validateVehicle };