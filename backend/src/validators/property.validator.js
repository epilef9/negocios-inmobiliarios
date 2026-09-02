const mongoose = require('mongoose');

const requiredFields = ['title', 'description', 'price', 'location', 'bedrooms', 'bathrooms', 'area'];
const numericFields = ['price', 'bedrooms', 'bathrooms', 'area'];

const validateProperty = (req, res, next) => {
    const errors = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    if (!isUpdate) {
        requiredFields.forEach((field) => {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                errors.push(`${field} es obligatorio`);
            }
        });
    }

    numericFields.forEach((field) => {
        if (req.body[field] !== undefined && (!Number.isFinite(Number(req.body[field])) || Number(req.body[field]) < 0)) {
            errors.push(`${field} debe ser un número no negativo`);
        }
    });

    if (req.body.images !== undefined && (!Array.isArray(req.body.images) || req.body.images.some((image) => typeof image !== 'string'))) {
        errors.push('images debe ser un arreglo de textos');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Datos de propiedad inválidos', errors });
    }

    next();
};

const validatePropertyId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'El id de la propiedad no es válido' });
    }

    next();
};

module.exports = { validateProperty, validatePropertyId };