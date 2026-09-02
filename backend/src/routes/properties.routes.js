const express = require('express');
const propertiesController = require('../controllers/properties.controller');
const { validateProperty, validatePropertyId } = require('../validators/property.validator');

const router = express.Router();

// Obtener todas las propiedades
router.get('/', propertiesController.getAllProperties);

// Obtener una propiedad específica
router.get('/:id', validatePropertyId, propertiesController.getPropertyById);

// Crear una nueva propiedad
router.post('/', validateProperty, propertiesController.createProperty);

// Actualizar una propiedad existente
router.put('/:id', validatePropertyId, validateProperty, propertiesController.updateProperty);

// Eliminar una propiedad
router.delete('/:id', validatePropertyId, propertiesController.deleteProperty);

module.exports = router;