const Joi = require('joi');

// Helper to validate MongoDB ObjectIds
const objectId = (value, helpers) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.message('"{{#label}}" must be a valid MongoDB ObjectId');
    }
    return value;
};

const validateBank = (data) => {
    const schema = Joi.object({
        userId: Joi.string().custom(objectId).required()
            .messages({ 'any.required': 'User ID is mandatory' }),
            
        holderName: Joi.string().min(3).max(100).trim().required(),
        
        bankName: Joi.string().min(2).max(100).trim().required(),
        
        // Account numbers are usually digits but stored as strings
        accountNo: Joi.string().regex(/^\d+$/).min(9).max(18).required()
            .messages({ 'string.pattern.base': 'Account number must contain only digits' }),
            
        branch: Joi.string().trim().required(),
        
        // Indian IFSC codes follow a specific pattern: 4 letters, 0, 6 digits/letters
        ifscCode: Joi.string().uppercase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).required()
            .messages({ 'string.pattern.base': 'Invalid IFSC code format (e.g., SBIN0012345)' }),
            
        status: Joi.string().valid('Active', 'Inactive').default('Active').required()
    });

    return schema.validate(data, { abortEarly: false });
};

module.exports = { validateBank };