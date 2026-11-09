const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const actividad = require('../services/actividad.service');
const { tienePermiso, esAdmin } = require('../utils/permisos');

const router = express.Router();
const ENTIDADES = [...Object.keys(actividad.SECCION_DE), 'empleado'];

// Todo lo reciente: solo el administrador
router.get('/', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
    try {
        const entidad = ENTIDADES.includes(req.query.entidad) ? req.query.entidad : undefined;
        res.json({ data: await actividad.recientes({ limite: Number(req.query.limite) || 100, entidad }) });
    } catch (error) {
        console.error('[actividad] Error al listar:', error);
        res.status(500).json({ message: 'No se pudo cargar la actividad.' });
    }
});

// Lo que se hizo sobre una visita, reserva, solicitud, propiedad, etc.: lo ve quien tiene permiso para esa sección
router.get('/:entidad/:id', authMiddleware, async (req, res) => {
    const { entidad, id } = req.params;
    if (!ENTIDADES.includes(entidad)) return res.status(404).json({ message: 'No encontramos esa actividad.' });
    const seccion = actividad.SECCION_DE[entidad];
    const permitido = seccion ? tienePermiso(req.user, seccion) : esAdmin(req.user);
    if (!permitido) return res.status(403).json({ message: 'No tenés permiso para ver esta actividad.', code: 'SIN_PERMISO' });
    try {
        res.json({ data: await actividad.deUnaEntidad(entidad, id) });
    } catch (error) {
        console.error('[actividad] Error al leer:', error);
        res.status(500).json({ message: 'No se pudo cargar la actividad.' });
    }
});

module.exports = router;
