const express = require('express');
const crypto = require('node:crypto');
const authMiddleware = require('../middlewares/auth.middleware');
const recordatorios = require('../services/recordatorios.service');

const router = express.Router();

// Vercel Cron llama con «Authorization: Bearer <CRON_SECRET>». Sin CRON_SECRET configurada no corre.
const deVercelCron = (req, res, next) => {
    const secreto = process.env.CRON_SECRET;
    if (!secreto) return res.status(503).json({ message: 'Falta configurar CRON_SECRET' });
    const recibido = Buffer.from(String(req.get('authorization') || ''));
    const esperado = Buffer.from(`Bearer ${secreto}`);
    if (recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    next();
};

router.get('/recordatorios', deVercelCron, async (_req, res) => {
    try {
        res.json({ data: await recordatorios.ejecutar() });
    } catch (error) {
        console.error('Error en los recordatorios automáticos:', error);
        res.status(500).json({ message: 'Fallaron los recordatorios' });
    }
});

// Inicio del panel: visitas de mañana y contratos para revisar
router.get('/panel', authMiddleware, authMiddleware.requireAdmin, async (_req, res) => {
    try {
        res.json({ data: await recordatorios.resumenPanel() });
    } catch (error) {
        console.error('Error al armar los recordatorios del panel:', error);
        res.status(500).json({ message: 'No se pudieron cargar los recordatorios' });
    }
});

module.exports = router;
