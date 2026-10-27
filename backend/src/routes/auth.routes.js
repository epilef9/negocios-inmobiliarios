const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin, validateEmailOnly } = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;
const { frenos } = require('../middlewares/seguridad');

// Endpoint para registro de nuevo usuario (HU-05)
router.post('/register', frenos.registro, require('../middlewares/captcha').verificarCaptcha, validateRegister, authController.register);

// Confirmación del email con el enlace del mail, y reenvío del enlace
router.post('/verify-email', frenos.tokens, authController.verifyEmail);
router.post('/resend-verification', frenos.enlaces, validateEmailOnly, authController.resendVerification);

// Contraseña olvidada: se pide un enlace por mail y con ese enlace se elige la nueva
router.post('/olvide-password', frenos.enlaces, validateEmailOnly, authController.olvidePassword);
router.post('/restablecer-password', frenos.tokens, authController.restablecerPassword);

// Cambio de email desde el perfil: se confirma con el enlace que llega al email nuevo
router.post('/confirmar-email', frenos.tokens, authController.confirmarCambioEmail);

// Endpoint para inicio de sesion (HU-09)
router.post('/login', frenos.loginIp, frenos.login, validateLogin, authController.login);

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