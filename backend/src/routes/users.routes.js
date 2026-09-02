const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { validateUser } = require('../validators/user.validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Obtener todos los usuarios
router.get('/', authMiddleware, usersController.getAllUsers);

// Crear un nuevo usuario
router.post('/', validateUser, usersController.createUser);

// Actualizar un usuario existente
router.put('/:id', authMiddleware, validateUser, usersController.updateUser);

// Eliminar un usuario
router.delete('/:id', authMiddleware, usersController.deleteUser);

module.exports = router;