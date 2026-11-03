const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const cobros = require('../services/cobros.service');

// Cobro mensual de alquileres: solo el administrador
const router = express.Router();
router.use(authMiddleware, authMiddleware.requireAdmin);

const responder = (accion, mensaje) => async (req, res) => {
    try {
        res.json({ data: await accion(req) });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error(`[cobros] ${mensaje}:`, error.message);
        res.status(500).json({ message: `${mensaje}.` });
    }
};

// ?periodo=2026-11 (sin periodo, el mes actual)
router.get('/', responder((req) => cobros.listar(req.query.periodo), 'No se pudieron cargar los cobros'));
router.get('/recibo/:id', responder((req) => cobros.recibo(req.params.id), 'No se pudo cargar el recibo'));
router.post('/actualizaciones/:contrato', responder((req) => cobros.registrarActualizacion(req.params.contrato, req.body), 'No se pudo guardar el monto nuevo'));
router.post('/:contrato/:periodo/pago', responder((req) => cobros.registrarPago(req.params.contrato, req.params.periodo, req.body), 'No se pudo registrar el pago'));
router.delete('/:contrato/:periodo/pago', responder((req) => cobros.anularPago(req.params.contrato, req.params.periodo), 'No se pudo anular el pago'));
router.post('/:contrato/:periodo/aviso', responder((req) => cobros.avisarAtraso(req.params.contrato, req.params.periodo), 'No se pudo mandar el aviso'));

module.exports = router;
