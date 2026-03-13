const Joi = require('joi');

const validateAddress = (data) =>{

	const schema = Joi.object({
	    userId: Joi.string()
	        .hex()
	        .length(24)
	        .required()
	        .messages({
	            'string.length': 'userId must be a valid MongoDB ObjectId',
	        }),

	    adharNo: Joi.string()
	        .regex(/^\d{12}$/)
	        .required()
	        .messages({
	            'string.pattern.base': 'Aadhar number must be exactly 12 digits',
	        }),

	    panCardNo: Joi.string()
	        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
	        .required()
	        .messages({
	            'string.pattern.base': 'Invalid PAN Card format (e.g., ABCDE1234F)',
	        }),

	    address: Joi.string().min(5).max(255).required(),
	    
	    city: Joi.string().required(),
	    
	    state: Joi.string().required(),
	    
	    country: Joi.string().required(),
	    
	    pinCode: Joi.string()
	        .regex(/^[1-9][0-9]{5}$/)
	        .required()
	        .messages({
	            'string.pattern.base': 'Pin code must be a 6-digit number',
	        }),

	    userType: Joi.string()
	        .valid('Individual', 'Company')
	        .required(),

	    status: Joi.string()
	        .valid('Active', 'Inactive')
	        .required()
	});
	return schema.validate(data);
};

module.exports = { validateAddress }