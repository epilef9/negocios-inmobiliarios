// properties.controller.js

const PropertyService = require('../services/properties.service');

// Obtener todas las propiedades
exports.getAllProperties = async (req, res) => {
    try {
        const properties = await PropertyService.getAllProperties(req.query);
        res.status(200).json({ data: properties });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener propiedades' });
    }
};

// Obtener una propiedad específica
exports.getPropertyById = async (req, res) => {
    const { id } = req.params;
    try {
        const property = await PropertyService.getPropertyById(id);
        if (!property) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(200).json({ data: property });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la propiedad' });
    }
};

// Crear una nueva propiedad
exports.createProperty = async (req, res) => {
    const propertyData = req.body;
    try {
        const newProperty = await PropertyService.createProperty(propertyData);
        res.status(201).json({ data: newProperty });
    } catch (error) {
        res.status(400).json({ message: 'No se pudo crear la propiedad', error: error.message });
    }
};

// Actualizar una propiedad existente
exports.updateProperty = async (req, res) => {
    const { id } = req.params;
    const propertyData = req.body;
    try {
        const updatedProperty = await PropertyService.updateProperty(id, propertyData);
        if (!updatedProperty) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(200).json({ data: updatedProperty });
    } catch (error) {
        res.status(400).json({ message: 'No se pudo actualizar la propiedad', error: error.message });
    }
};

// Eliminar una propiedad
exports.deleteProperty = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProperty = await PropertyService.deleteProperty(id);
        if (!deletedProperty) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la propiedad' });
    }
};