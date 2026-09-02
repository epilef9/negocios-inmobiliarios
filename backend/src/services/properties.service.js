const Property = require('../models/property.model');
const propertiesRepository = require('../repositories/properties.repository');

const getAllProperties = async (filters) => {
    try {
        return await propertiesRepository.findAll(filters);
    } catch (error) {
        throw new Error('Error retrieving properties: ' + error.message);
    }
};

const getPropertyById = async (id) => {
    try {
        const property = await propertiesRepository.findById(id);
        if (!property) {
            throw new Error('Property not found');
        }
        return property;
    } catch (error) {
        throw new Error('Error retrieving property: ' + error.message);
    }
};

const createProperty = async (propertyData) => {
    try {
        const newProperty = new Property(propertyData);
        return await propertiesRepository.create(newProperty);
    } catch (error) {
        throw new Error('Error creating property: ' + error.message);
    }
};

const updateProperty = async (id, propertyData) => {
    try {
        const updatedProperty = await propertiesRepository.update(id, propertyData);
        if (!updatedProperty) {
            throw new Error('Property not found or not updated');
        }
        return updatedProperty;
    } catch (error) {
        throw new Error('Error updating property: ' + error.message);
    }
};

const deleteProperty = async (id) => {
    try {
        const deletedProperty = await propertiesRepository.delete(id);
        if (!deletedProperty) {
            throw new Error('Property not found or not deleted');
        }
        return deletedProperty;
    } catch (error) {
        throw new Error('Error deleting property: ' + error.message);
    }
};

module.exports = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
};