const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Endpoint para autenticación de usuario
router.post('/login', authController.login);

// Endpoint para cierre de sesión
router.post('/logout', authController.logout);

module.exports = router;