const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;
const disponibilidadController = require('../controllers/disponibilidad.controller');

// Ver qué noches están libres es público (ficha de la propiedad); cargarlas y borrarlas, solo el administrador
const soloAdmin = [authMiddleware, requireAdmin];

// Rangos completos con tipo y motivo, para el panel
router.get('/:propiedadId/rangos', soloAdmin, disponibilidadController.getRangos);

// Noches ocupadas de una propiedad temporaria (público, sin datos internos)
router.get('/:propiedadId', disponibilidadController.getDisponibilidad);

// Marcar un rango como bloqueado u ocupado
router.post('/', soloAdmin, disponibilidadController.createRango);

// Liberar un rango
router.delete('/:id', soloAdmin, disponibilidadController.deleteRango);

module.exports = router;
