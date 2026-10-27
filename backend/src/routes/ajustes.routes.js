const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ajustes = require('../services/ajustes.service');

const router = express.Router();

// Público: contacto de la oficina y, si se publicaron, los costos de la calculadora
router.get('/', async (_req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=60');
        res.json({ data: await ajustes.publicos() });
    } catch (error) {
        console.error('Error al leer los ajustes:', error);
        res.status(500).json({ message: 'No se pudieron leer los datos de contacto' });
    }
});

// Administrador: todo (incluye los datos bancarios) y guardar cambios
router.get('/admin', authMiddleware, authMiddleware.requireAdmin, async (_req, res) => {
    try {
        res.json({ data: await ajustes.leer() });
    } catch (error) {
        console.error('Error al leer los ajustes:', error);
        res.status(500).json({ message: 'No se pudieron leer los ajustes' });
    }
});

router.put('/', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
    try {
        const { ajustes: guardados, error } = await ajustes.guardar(req.body);
        if (error) return res.status(400).json({ message: error });
        res.json({ data: guardados, message: 'Cambios guardados' });
    } catch (error) {
        console.error('Error al guardar los ajustes:', error);
        res.status(500).json({ message: 'No se pudieron guardar los ajustes' });
    }
});

module.exports = router;
