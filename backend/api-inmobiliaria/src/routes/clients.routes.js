const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients.controller');

// Obtener todos los clientes
router.get('/', clientsController.getAllClients);

// Obtener un cliente específico
router.get('/:id', clientsController.getClientById);

// Crear un nuevo cliente
router.post('/', clientsController.createClient);

// Actualizar un cliente existente
router.put('/:id', clientsController.updateClient);

// Eliminar un cliente
router.delete('/:id', clientsController.deleteClient);

module.exports = router;