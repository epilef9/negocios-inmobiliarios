// properties.controller.js

const PropertyService = require('../services/properties.service');

// Obtener todas las propiedades
exports.getAllProperties = async (req, res) => {
    try {
        const properties = await PropertyService.getAllProperties();
        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener propiedades', error });
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
        res.status(200).json(property);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la propiedad', error });
    }
};

// Crear una nueva propiedad
exports.createProperty = async (req, res) => {
    const propertyData = req.body;
    try {
        const newProperty = await PropertyService.createProperty(propertyData);
        res.status(201).json(newProperty);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la propiedad', error });
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
        res.status(200).json(updatedProperty);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la propiedad', error });
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
        res.status(500).json({ message: 'Error al eliminar la propiedad', error });
    }
};