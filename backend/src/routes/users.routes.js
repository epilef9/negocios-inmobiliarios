const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { frenos } = require('../middlewares/seguridad');
const perfilController = require('../controllers/perfil.controller');

// Perfil propio: cualquier persona con sesión iniciada.
// (La gestión de usuarios por el administrador se sacó: no la usaba ninguna pantalla, guardaba contraseñas
// sin cifrar y devolvía los datos de todas las cuentas.)
router.get('/me', authMiddleware, perfilController.obtener);
router.put('/me', authMiddleware, frenos.perfil, perfilController.actualizar);
// Contraseña: se cambia escribiendo la actual (HU-31) o, si no se acuerda, con un enlace al email de la cuenta
router.put('/me/password', authMiddleware, frenos.cambioClave, perfilController.cambiarPassword);
router.post('/me/password', authMiddleware, frenos.enlaces, perfilController.pedirCambioPassword);

module.exports = router;
