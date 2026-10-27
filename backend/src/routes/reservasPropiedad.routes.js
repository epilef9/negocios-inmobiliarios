const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;
const controller = require('../controllers/reservasPropiedad.controller');

// HU-13: las reservas con seña las registra y gestiona solo el administrador
router.use(authMiddleware, requireAdmin);

router.get('/', controller.listar);
router.post('/', controller.crear);
router.patch('/:id/concretar', controller.concretar);
router.patch('/:id/cancelar', controller.cancelar);
router.patch('/:id/extender', controller.extender);

module.exports = router;
