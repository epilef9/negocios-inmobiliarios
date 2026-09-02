const Property = require('../models/property.model');
const propertiesRepository = require('../repositories/properties.repository');

const getAllProperties = async (filters) => {
    return propertiesRepository.getAllProperties(filters);
};

const getPropertyById = async (id) => {
    return propertiesRepository.getPropertyById(id);
};

const createProperty = async (propertyData) => {
    return propertiesRepository.createProperty(propertyData);
};

const updateProperty = async (id, propertyData) => {
    return propertiesRepository.updateProperty(id, propertyData);
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