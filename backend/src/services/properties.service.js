const Property = require('../models/property.model');
const propertiesRepository = require('../repositories/properties.repository');

const DEFAULT_DOLLAR_RATE = 1370;

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

const getAllProperties = async (filters) => {
    return propertiesRepository.getAllProperties(filters);
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