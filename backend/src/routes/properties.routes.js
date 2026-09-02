const express = require('express');
const propertiesController = require('../controllers/properties.controller');
const { validateProperty } = require('../validators/property.validator');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Obtener todas las propiedades
router.get('/', propertiesController.getAllProperties);

// Obtener una propiedad específica
router.get('/:id', propertiesController.getPropertyById);

// Crear una nueva propiedad
router.post('/', authenticate, validateProperty, propertiesController.createProperty);

// Actualizar una propiedad existente
router.put('/:id', authenticate, validateProperty, propertiesController.updateProperty);

// Eliminar una propiedad
router.delete('/:id', authenticate, propertiesController.deleteProperty);

module.exports = router;