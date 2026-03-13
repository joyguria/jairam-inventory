const Joi = require('joi');

const signinValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org'] } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(5)
      .required()
      .messages({
        'string.min': 'Password must be at least 5 characters long',
        'any.required': 'Password is required'
      }),
  });

  return schema.validate(data);
};


const signupValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'Name must be at least 3 characters long',
        'any.required': 'Name is required'
      }),

    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),

    phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits'
      }),

    password: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long'
      }),

    role: Joi.string().valid('Investor', 'Driver', 'Agent', 'Employee', 'Admin', 'SuperAdmin')
      .required()
      .messages({
        'any.required': 'Role is required'
      }),
    emailVerified: Joi.boolean().default(false),    
    otpCode: Joi.string().allow(null),    
    policyStatus: Joi.string().default('Pending'),
    status: Joi.string().valid('Pending', 'Active', 'Inactive'),
    createdBy: Joi.string().default('self')
  });

  return schema.validate(data);
};

module.exports = { signinValidation, signupValidation};