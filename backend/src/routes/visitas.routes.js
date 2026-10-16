const express = require('express');
const router = express.Router();
const visitasController = require('../controllers/visitas.controller');
const {
    validateVisita,
    validateVisitaId,
    validateEstadoUpdate,
} = require('../validators/visita.validator');

// Reiniciar visitas a valores por defecto
router.post('/reset', visitasController.resetVisitas);

// Obtener todas las visitas (soporta filtros ?estado=...&fecha=...&search=...)
router.get('/', visitasController.getAllVisitas);

// Obtener una visita por ID
router.get('/:id', validateVisitaId, visitasController.getVisitaById);

// Crear una nueva visita
router.post('/', validateVisita, visitasController.createVisita);

// Actualizar una visita existente
router.put('/:id', validateVisitaId, validateVisita, visitasController.updateVisita);

// Actualizar únicamente el estado de una visita (confirmar, reprogramar, rechazar)
router.patch('/:id/estado', validateVisitaId, validateEstadoUpdate, visitasController.updateEstadoVisita);

// Eliminar una visita
router.delete('/:id', validateVisitaId, visitasController.deleteVisita);

module.exports = router;
