const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Endpoint para registro de nuevo usuario (HU-05)
router.post('/register', validateRegister, authController.register);

// Endpoint para inicio de sesion (HU-09)
router.post('/login', validateLogin, authController.login);

// Endpoint para obtener datos del usuario autenticado actual
router.get('/me', authMiddleware, authController.me);

// Endpoints para persistencia del checklist de requisitos del usuario
router.get('/checklist', authMiddleware, authController.getChecklist);
router.put('/checklist', authMiddleware, authController.updateChecklist);

// Endpoint para cierre de sesion
router.post('/logout', authController.logout);

module.exports = router;