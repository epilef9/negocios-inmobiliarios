const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const { frenos } = require('../middlewares/seguridad');
const pagos = require('../services/pagos.service');

const router = express.Router();
const soloAdmin = [authMiddleware, authMiddleware.requireAdmin];
const soloCliente = [authMiddleware, authMiddleware.requireClient];

// El comprobante queda en memoria solo para validarlo y guardarlo (Vercel no acepta pedidos de más de ~4,5 MB)
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });

const responder = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        if (error instanceof pagos.ErrorPago) return res.status(error.status).json({ message: error.message });
        if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'El comprobante puede pesar hasta 4 MB.' });
        console.error('[pagos] Error:', error);
        res.status(500).json({ message: 'No pudimos procesar el pago. Probá de nuevo en un momento.' });
    }
};

// Notificaciones de Mercado Pago (sin sesión: se valida la firma y se consulta el pago a Mercado Pago)
router.post(
    '/webhook',
    responder(async (req, res) => {
        await pagos.webhook({ cuerpo: req.body, query: req.query, firma: req.get('x-signature'), requestId: req.get('x-request-id') });
        res.status(200).json({ ok: true });
    })
);

// Cliente
router.get('/mios', soloCliente, responder(async (req, res) => res.json({ data: await pagos.mios(req.user._id) })));
router.get('/reserva/:id', soloCliente, responder(async (req, res) => res.json({ data: await pagos.opciones(req.params.id, req.user._id) })));
router.post('/reserva/:id/mercadopago', frenos.reservas, soloCliente, responder(async (req, res) => res.json({ data: await pagos.crearPreferencia(req.params.id, req.user) })));
router.post(
    '/reserva/:id/comprobante',
    frenos.uploads,
    soloCliente,
    (req, res, next) =>
        subida.single('comprobante')(req, res, (error) => {
            if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'El comprobante puede pesar hasta 4 MB.' : 'No pudimos leer el archivo.' });
            next();
        }),
    responder(async (req, res) => res.status(201).json({ data: await pagos.subirComprobante(req.params.id, req.user, req.file), message: 'Recibimos el comprobante. Te avisamos cuando lo revisemos.' }))
);

// Administrador
router.get('/', soloAdmin, responder(async (_req, res) => res.json({ data: await pagos.listarAdmin() })));
router.get(
    '/:id/comprobante',
    soloAdmin,
    responder(async (req, res) => {
        const archivo = await pagos.comprobante(req.params.id);
        if (!archivo) return res.status(404).json({ message: 'No hay comprobante' });
        res.set({
            'Content-Type': archivo.tipo,
            'Content-Disposition': `inline; filename="${archivo.nombre.replace(/"/g, '')}"`,
            'Cache-Control': 'private, no-store',
            'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
            'X-Content-Type-Options': 'nosniff',
        });
        res.send(archivo.datos);
    })
);
router.patch('/:id/aprobar', soloAdmin, responder(async (req, res) => res.json({ data: await pagos.revisarTransferencia(req.params.id, true, req.body?.nota), message: 'Pago confirmado' })));
router.patch('/:id/rechazar', soloAdmin, responder(async (req, res) => res.json({ data: await pagos.revisarTransferencia(req.params.id, false, req.body?.nota), message: 'Comprobante rechazado' })));

module.exports = router;
