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
const allowedFields = new Set([
    'title', 'codigoInterno', 'description', 'price', 'moneda', 'priceARS', 'cotizacionDolar',
    'location', 'ciudad', 'provincia', 'direccionCompleta', 'referenciasUbicacion',
    'categoria_operacion', 'tipo_inmueble', 'cantidad_ambientes', 'comodidades', 'otrasComodidades',
    'expensas', 'montoExpensas', 'cochera', 'pisoUnidad', 'linkGoogleMaps', 'latitud', 'longitud',
    'permitirVisita', 'permitirWhatsApp', 'permitirEmail', 'horarioAtencion', 'telefonoWhatsApp',
    'precioPorNocheUSD', 'minimoNoches', 'huespedesMaximos', 'costoLimpiezaUSD',
    'duracionAlquilerMeses', 'unidadDuracionAlquiler', 'checkInDesde', 'checkOutHasta',
    'checkInFlexible', 'estado', 'images',
]);
const stringLimits = {
    title: 160, codigoInterno: 60, description: 3000, location: 240, ciudad: 100,
    direccionCompleta: 240, referenciasUbicacion: 500, otrasComodidades: 500,
    linkGoogleMaps: 1000, latitud: 40, longitud: 40, horarioAtencion: 100,
    telefonoWhatsApp: 40, checkInDesde: 20, checkOutHasta: 20,
};

const validateProperty = (req, res, next) => {
    const errors = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ message: 'El cuerpo de la propiedad debe ser un objeto' });
    }

    const unknownFields = Object.keys(req.body).filter((field) =>
        !allowedFields.has(field) || field.includes('.') || field.startsWith('$')
    );
    if (unknownFields.length > 0) {
        errors.push(`Campos no permitidos: ${unknownFields.join(', ')}`);
    }

    Object.entries(stringLimits).forEach(([field, maxLength]) => {
        if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > maxLength)) {
            errors.push(`${field} debe ser un texto de hasta ${maxLength} caracteres`);
        }
    });

    ['permitirVisita', 'permitirWhatsApp', 'permitirEmail'].forEach((field) => {
        if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
            errors.push(`${field} debe ser booleano`);
        }
    });

    if (!isUpdate) {
        requiredFields.forEach((field) => {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                errors.push(`${field} es obligatorio`);
            }
        });
    }

    numericFields.forEach((field) => {
        const value = req.body[field];
        const hasValidType = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
        if (value !== undefined && (!hasValidType || !Number.isFinite(Number(value)) || Number(value) < 0)) {
            errors.push(`${field} debe ser un número no negativo`);
        }
    });

    if (req.body.images !== undefined && (!Array.isArray(req.body.images) || req.body.images.some((image) => typeof image !== 'string'))) {
        errors.push('images debe ser un arreglo de textos');
    }

    if (Array.isArray(req.body.images) && req.body.images.length > 20) {
        errors.push('images no puede contener más de 20 elementos');
    }

    if (Array.isArray(req.body.comodidades) && (req.body.comodidades.length > 30 || req.body.comodidades.some((item) => typeof item !== 'string' || item.length > 80))) {
        errors.push('comodidades contiene valores inválidos');
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