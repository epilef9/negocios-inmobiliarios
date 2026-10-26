const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireAdmin } = authMiddleware;
const { frenos } = require('../middlewares/seguridad');
const reservasController = require('../controllers/reservas.controller');

// Reservar es solo para clientes con sesión; verlas todas, confirmarlas y rechazarlas, solo el administrador
const soloAdmin = [authMiddleware, requireAdmin];
// El administrador carga las estadías desde el panel (Disponibilidad), no reservando desde el sitio
const soloClientes = (req, res, next) => {
    if (req.user?.role === 'admin') {
        return res.status(403).json({ message: 'Con la cuenta de administrador las estadías se cargan desde el panel.' });
    }
    next();
};

// Mi cuenta: las reservas del cliente con sesión
router.get('/mias', authMiddleware, reservasController.mias);

// Número para el contador de la barra lateral del panel
router.get('/pendientes/cantidad', soloAdmin, reservasController.cantidadPendientes);

// Todas las reservas (?estado=pendiente|confirmada|rechazada|vencida|cancelada)
router.get('/', soloAdmin, reservasController.listar);

// Pedir una estadía
router.post('/', frenos.reservas, authMiddleware, soloClientes, reservasController.crear);

router.patch('/:id/confirmar', soloAdmin, reservasController.confirmar);
router.patch('/:id/rechazar', soloAdmin, reservasController.rechazar);

// El cliente cancela una suya que todavía está pendiente
router.patch('/:id/cancelar', authMiddleware, reservasController.cancelar);

module.exports = router;
