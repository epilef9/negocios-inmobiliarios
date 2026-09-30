const Property = require('../models/property.model');
const propertiesRepository = require('../repositories/properties.repository');

const DEFAULT_DOLLAR_RATE = 1370;
const PROPERTY_AMENITIES = new Set([
    'aire',
    'ascensor',
    'cocina',
    'balcon',
    'wifi',
    'tv',
    'seguridad',
    'cochera_cubierta',
    'calefaccion',
    'pileta',
    'parrilla',
    'laundry',
]);

const normalizePropertyPrices = (propertyData) => {
    const normalized = { ...propertyData };
    const rate = Number(normalized.cotizacionDolar) > 0
        ? Number(normalized.cotizacionDolar)
        : DEFAULT_DOLLAR_RATE;

    normalized.cotizacionDolar = rate;

    if (normalized.moneda === 'ARS') {
        const priceARS = Number(normalized.priceARS ?? normalized.price);
        normalized.priceARS = priceARS;
        normalized.price = Number((priceARS / rate).toFixed(2));
    } else {
        normalized.moneda = 'USD';
        normalized.price = Number(normalized.price);
        normalized.priceARS = Number((normalized.price * rate).toFixed(2));
    }

    return normalized;
};

const getAllProperties = async (filters = {}) => {
    const query = {};
    if (typeof filters.comodidad === 'string' && filters.comodidad.trim()) {
        const amenity = filters.comodidad.trim();
        query.comodidades = PROPERTY_AMENITIES.has(amenity) ? amenity : '__invalid_amenity__';
    }

    return propertiesRepository.getAllProperties(query);
};

const getPropertyById = async (id) => {
    return propertiesRepository.getPropertyById(id);
};

const createProperty = async (propertyData) => {
    return propertiesRepository.createProperty(normalizePropertyPrices(propertyData));
};

const updateProperty = async (id, propertyData) => {
    return propertiesRepository.updateProperty(id, normalizePropertyPrices(propertyData));
};

const deleteProperty = async (id) => {
    return propertiesRepository.deleteProperty(id);
};

module.exports = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
};