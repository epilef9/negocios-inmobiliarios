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

// Resumen para el panel
router.get('/', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
    try {
        res.json({ data: await estadisticas.resumen(req.query.dias) });
    } catch (error) {
        console.error('Error al calcular las estadísticas:', error);
        res.status(500).json({ message: 'No se pudieron calcular las estadísticas' });
    }
});

module.exports = router;
