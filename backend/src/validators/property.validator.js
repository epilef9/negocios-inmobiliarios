const mongoose = require('mongoose');

const requiredFields = ['title', 'price', 'location', 'bedrooms', 'bathrooms', 'area'];
const numericFields = [
    'price',
    'priceARS',
    'cotizacionDolar',
    'bedrooms',
    'bathrooms',
    'area',
    'cantidad_ambientes',
    'montoExpensas',
    'precioPorNocheUSD',
    'minimoNoches',
    'huespedesMaximos',
    'costoLimpiezaUSD',
    'duracionAlquilerMeses',
];

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

    if (req.body.provincia !== undefined && req.body.provincia !== 'entre_rios') {
        errors.push('La inmobiliaria solo opera en Entre Ríos');
    }

    if (req.body.unidadDuracionAlquiler !== undefined && !['meses', 'años'].includes(req.body.unidadDuracionAlquiler)) {
        errors.push('La unidad de duración debe ser meses o años');
    }

    if (req.body.unidadDuracionAlquiler === 'meses' && Number(req.body.duracionAlquilerMeses) > 11) {
        errors.push('La duración en meses no puede superar los 11 meses');
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