const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { registra } = require('../middlewares/actividad');
const capitalizar = (t) => (typeof t === 'string' && t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Cambió de estado');
const { requirePermiso } = authMiddleware;
const controller = require('../controllers/reservasPropiedad.controller');

// HU-13: las reservas con seña las registra y gestiona solo el administrador
router.use(authMiddleware, requirePermiso('senas'));

router.get('/', controller.listar);
router.post('/', registra('sena', 'Registrada'), controller.crear);
router.patch('/:id/concretar', registra('sena', 'Concretada'), controller.concretar);
router.patch('/:id/cancelar', registra('sena', 'Cancelada'), controller.cancelar);
router.patch('/:id/extender', registra('sena', 'Extendida'), controller.extender);

module.exports = router;
