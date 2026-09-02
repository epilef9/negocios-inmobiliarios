const { body, param } = require('express-validator');

const propertyValidator = {
    createProperty: [
        body('title').notEmpty().withMessage('Title is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('price').isNumeric().withMessage('Price must be a number'),
        body('location').notEmpty().withMessage('Location is required'),
        body('type').notEmpty().withMessage('Property type is required'),
        body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
        body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
    ],
    updateProperty: [
        param('id').isMongoId().withMessage('Invalid property ID'),
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('description').optional().notEmpty().withMessage('Description cannot be empty'),
        body('price').optional().isNumeric().withMessage('Price must be a number'),
        body('location').optional().notEmpty().withMessage('Location cannot be empty'),
        body('type').optional().notEmpty().withMessage('Property type cannot be empty'),
        body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
        body('bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
    ],
    getProperty: [
        param('id').isMongoId().withMessage('Invalid property ID'),
    ],
    deleteProperty: [
        param('id').isMongoId().withMessage('Invalid property ID'),
    ],
};

module.exports = propertyValidator;