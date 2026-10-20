const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;

// Datos personales de clientes: solo el administrador (RF-09 / RNF-05)
router.use(authMiddleware, requireAdmin);
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