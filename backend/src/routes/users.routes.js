const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;

// Gestión de usuarios: solo el administrador. Antes cualquiera podía crearse un usuario admin.
router.use(authMiddleware, requireAdmin);
const usersController = require('../controllers/users.controller');
const { validateUser } = require('../validators/user.validator');

// Obtener todos los usuarios
router.get('/', usersController.getAllUsers);

// Crear un nuevo usuario
router.post('/', validateUser, usersController.createUser);

// Actualizar un usuario existente
router.put('/:id', validateUser, usersController.updateUser);

// Eliminar un usuario
router.delete('/:id', usersController.deleteUser);

module.exports = router;