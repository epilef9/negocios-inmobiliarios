const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { frenos } = require('../middlewares/seguridad');
const estadisticas = require('../services/estadisticas.service');

const router = express.Router();

// El navegador avisa que se abrió una ficha o se tocó WhatsApp. Siempre responde 204 (no da pistas).
router.post('/evento', frenos.estadisticas, async (req, res) => {
    try {
        const { propiedad, tipo } = req.body || {};
        if (typeof propiedad === 'string' && typeof tipo === 'string') await estadisticas.registrarEvento(propiedad, tipo);
    } catch (error) {
        console.error('Error al registrar la estadística:', error.message);
    }
    res.status(204).end();
});

// Las propiedades de quien está conectado (las que publicó o están a su nombre), para Mi cuenta
router.get('/mias', authMiddleware, async (req, res) => {
    try {
        res.json({ data: await estadisticas.deDueno(req.user._id, req.query.dias) });
    } catch (error) {
        console.error('Error al calcular tus estadísticas:', error);
        res.status(500).json({ message: 'No se pudieron calcular las estadísticas' });
    }
});

// Resumen para el panel
router.get('/', authMiddleware, authMiddleware.requirePermiso('estadisticas'), async (req, res) => {
    try {
        res.json({ data: await estadisticas.resumen(req.query.dias) });
    } catch (error) {
        console.error('Error al calcular las estadísticas:', error);
        res.status(500).json({ message: 'No se pudieron calcular las estadísticas' });
    }
});

module.exports = router;
