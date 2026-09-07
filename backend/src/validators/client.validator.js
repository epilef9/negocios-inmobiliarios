// Este archivo contiene las validaciones para los datos de entrada relacionados con los clientes.

const { body, validationResult } = require('express-validator');

const clientValidator = [
    body('name')
        .notEmpty().withMessage('El nombre es obligatorio.')
        .isString().withMessage('El nombre debe ser una cadena de texto.'),
    body('email')
        .notEmpty().withMessage('El correo electrónico es obligatorio.')
        .isEmail().withMessage('El formato del correo electrónico no es válido.'),
    body('phone')
        .optional()
        .isString().withMessage('El teléfono debe ser una cadena de texto.'),
    body('address')
        .optional()
        .isString().withMessage('La dirección debe ser una cadena de texto.'),
    body('preferences')
        .optional()
        .isArray().withMessage('Las preferencias deben ser un arreglo.'),
];

const validateClient = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    clientValidator,
    validateClient,
};