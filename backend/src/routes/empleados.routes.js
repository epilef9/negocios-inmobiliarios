const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { registra } = require('../middlewares/actividad');
const empleados = require('../services/empleados.service');
const { SECCIONES } = require('../utils/permisos');

const router = express.Router();

// Crear, editar y dar de baja empleados es solo del administrador
router.use(authMiddleware, authMiddleware.requireAdmin);

const responder = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (error.code === 11000) return res.status(409).json({ message: 'Ya hay una cuenta con ese email.' });
        console.error('[empleados] Error:', error);
        res.status(500).json({ message: 'No se pudo completar la operación.' });
    }
};

router.get('/', responder(async (_req, res) => res.json({ data: await empleados.listar(), secciones: SECCIONES })));

router.post('/', registra('empleado', 'Cuenta creada', { detalle: (req) => req.body?.email }), responder(async (req, res) =>
    res.status(201).json({ data: await empleados.crear(req.body) })));

router.put('/:id', registra('empleado', (req) => (req.body?.activo === true ? 'Cuenta reactivada' : 'Cuenta modificada')), responder(async (req, res) =>
    res.json({ data: await empleados.actualizar(req.params.id, req.body) })));

router.delete('/:id', registra('empleado', 'Cuenta dada de baja'), responder(async (req, res) =>
    res.json({ data: await empleados.darDeBaja(req.params.id) })));

module.exports = router;
