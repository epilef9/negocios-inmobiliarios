const express = require('express');
const router = express.Router();
const solicitudPublicacionController = require('../controllers/solicitudPublicacion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;

// Rutas de cliente (requiere estar autenticado)
router.post('/', authMiddleware, solicitudPublicacionController.crear);
router.get('/mis-solicitudes', authMiddleware, solicitudPublicacionController.listarMisSolicitudes);

// Rutas de administración
router.get('/', authMiddleware, requireAdmin, solicitudPublicacionController.listarAdmin);
router.get('/:id', authMiddleware, solicitudPublicacionController.obtenerPorId);
router.put('/:id/aprobar', authMiddleware, requireAdmin, solicitudPublicacionController.aprobar);
router.put('/:id/rechazar', authMiddleware, requireAdmin, solicitudPublicacionController.rechazar);

module.exports = router;
