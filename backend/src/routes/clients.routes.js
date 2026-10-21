const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;

// Datos personales de clientes: solo el administrador (RF-09 / RNF-05)
router.use(authMiddleware, requireAdmin);
const clientsController = require('../controllers/clients.controller');

// Panel de clientes: propietarios e inquilinos vinculados a propiedades (va antes de '/:id')
router.get('/panel', clientsController.getPanel);

// Asignar o quitar el propietario o el inquilino de una propiedad
router.put('/propiedades/:id/:rol', clientsController.asignarPersona);

// Obtener todos los clientes
router.get('/',clientsController.getAllClients);

// Obtener un cliente específico
router.get('/:id', clientsController.getClientById);

// Crear un nuevo cliente
router.post('/', clientsController.createClient);

// Actualizar un cliente existente
router.put('/:id', clientsController.updateClient);

// Eliminar un cliente
router.delete('/:id', clientsController.deleteClient);

module.exports = router;