const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { frenos } = require('../middlewares/seguridad');
const avisos = require('../services/avisos.service');

const router = express.Router();

// Darse de baja desde el link del mail (sin sesión: el token largo y al azar es la llave)
router.post('/baja', frenos.tokens, async (req, res) => {
    try {
        const aviso = await avisos.bajaPorToken(req.body?.token);
        if (!aviso) return res.status(404).json({ message: 'El link de baja no es válido o ya se usó.' });
        res.json({ data: { tipo: aviso.tipo }, message: 'Listo, no vas a recibir más este aviso.' });
    } catch (error) {
        console.error('[avisos] Error en la baja:', error);
        res.status(500).json({ message: 'No pudimos darte de baja. Probá de nuevo.' });
    }
});

router.use(authMiddleware, authMiddleware.requireClient);

router.get('/', async (req, res) => {
    try {
        res.json({ data: await avisos.mios(req.user._id) });
    } catch (error) {
        console.error('[avisos] Error al listar:', error);
        res.status(500).json({ message: 'No pudimos cargar tus avisos' });
    }
});

router.post('/', frenos.perfil, async (req, res) => {
    try {
        const { aviso, error, status = 200 } = await avisos.crear(req.user._id, req.body);
        if (error) return res.status(status).json({ message: error });
        res.status(status).json({ data: aviso, message: 'Aviso activado' });
    } catch (error) {
        console.error('[avisos] Error al crear:', error);
        res.status(500).json({ message: 'No pudimos activar el aviso' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!(await avisos.quitar(req.user._id, req.params.id))) return res.status(404).json({ message: 'Ese aviso no está activo.' });
        res.json({ message: 'Aviso quitado' });
    } catch (error) {
        console.error('[avisos] Error al quitar:', error);
        res.status(500).json({ message: 'No pudimos quitar el aviso' });
    }
});

module.exports = router;
