const { body, validationResult } = require('express-validator');

const userValidator = [
    body('name')
        .isString()
        .withMessage('El nombre debe ser una cadena de texto.')
        .notEmpty()
        .withMessage('El nombre es obligatorio.'),
    body('email')
        .isEmail()
        .withMessage('El correo electrónico no es válido.')
        .notEmpty()
        .withMessage('El correo electrónico es obligatorio.'),
    body('password')
        .isString()
        .withMessage('La contraseña debe ser una cadena de texto.')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.')
        .notEmpty()
        .withMessage('La contraseña es obligatoria.'),
    body('role')
        .optional()
        .isIn(['admin', 'user'])
        .withMessage('El rol debe ser "admin" o "user".'),
];

const validateUser = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    userValidator,
    validateUser,
};