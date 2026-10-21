const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin, validateEmailOnly } = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;

// Endpoint para registro de nuevo usuario (HU-05)
router.post('/register', validateRegister, authController.register);

// Confirmación del email con el enlace del mail, y reenvío del enlace
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', validateEmailOnly, authController.resendVerification);

// Endpoint para inicio de sesion (HU-09)
router.post('/login', validateLogin, authController.login);

// Endpoint para obtener datos del usuario autenticado actual
router.get('/me', authMiddleware, authController.me);

// Endpoints para persistencia de preferencias visuales del usuario
router.get('/preferences', authMiddleware, requireAdmin, authController.getPreferences);
router.put('/preferences', authMiddleware, requireAdmin, authController.updatePreferences);

// Endpoints para persistencia del checklist de requisitos del usuario
router.get('/checklist', authMiddleware, authController.getChecklist);
router.put('/checklist', authMiddleware, authController.updateChecklist);

// Favoritos del usuario autenticado
router.get('/favoritos', authMiddleware, authController.getFavoritos);
router.put('/favoritos/:propertyId', authMiddleware, authController.agregarFavorito);
router.delete('/favoritos/:propertyId', authMiddleware, authController.quitarFavorito);

// Endpoint para cierre de sesion
router.post('/logout', authController.logout);

module.exports = router;