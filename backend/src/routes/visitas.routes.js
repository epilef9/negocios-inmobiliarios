const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin, requireClient, sesionOpcional } = authMiddleware;
const { frenos } = require('../middlewares/seguridad');

// Pedir una visita es público (botón "Agendar una visita"); verlas y gestionarlas, solo el administrador
const soloAdmin = [authMiddleware, requireAdmin];
const visitasController = require('../controllers/visitas.controller');
const {
    validateVisita,
    validateVisitaId,
    validateEstadoUpdate,
} = require('../validators/visita.validator');

// Reiniciar visitas a valores por defecto
router.post('/reset', soloAdmin, visitasController.resetVisitas);

// Obtener todas las visitas (soporta filtros ?estado=...&fecha=...&search=...)
router.get('/', soloAdmin, visitasController.getAllVisitas);

// Días y horarios libres para el calendario de "Agendar una visita" (público, sin datos de nadie).
// Va antes de '/:id' para que "disponibilidad" no se tome como un id.
router.get('/disponibilidad', visitasController.getDisponibilidad);

// HU-34: las visitas del cliente que inició sesión, y cancelar una suya (antes de '/:id')
router.get('/mias', authMiddleware, requireClient, visitasController.misVisitas);
router.patch('/:id/cancelar', authMiddleware, requireClient, validateVisitaId, visitasController.cancelarMiVisita);

// Obtener una visita por ID
router.get('/:id', soloAdmin, validateVisitaId, visitasController.getVisitaById);

// Crear una nueva visita
router.post('/', frenos.visitas, sesionOpcional, validateVisita, visitasController.createVisita);

// Actualizar una visita existente
router.put('/:id', soloAdmin, validateVisitaId, validateVisita, visitasController.updateVisita);

// Actualizar únicamente el estado de una visita (confirmar, reprogramar, rechazar)
router.patch('/:id/estado', soloAdmin, validateVisitaId, validateEstadoUpdate, visitasController.updateEstadoVisita);

// Eliminar una visita
router.delete('/:id', soloAdmin, validateVisitaId, visitasController.deleteVisita);

module.exports = router;
