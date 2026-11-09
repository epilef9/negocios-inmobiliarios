const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermiso } = authMiddleware;
const agendaController = require('../controllers/agenda.controller');

// Ver el horario de visitas es público; cambiarlo, solo el administrador (HU-19)
router.get('/horario', agendaController.getHorario);
router.put('/horario', authMiddleware, requirePermiso('horario'), agendaController.putHorario);

module.exports = router;
