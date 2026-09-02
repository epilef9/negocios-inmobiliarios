// Este archivo contiene middleware para la validación de datos de entrada en las solicitudes. 
// Se utilizará para asegurar que los datos cumplan con los requisitos antes de ser procesados por los controladores.

const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateRequest,
};