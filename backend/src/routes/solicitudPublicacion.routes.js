const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const solicitudPublicacionController = require('../controllers/solicitudPublicacion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { usaCloudinary, subirACloudinary } = require('../services/imagenes.service');
const { requireAdmin } = authMiddleware;

const uploadsDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

const TIPOS_PERMITIDOS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
};

const almacenamientoLocal = multer.diskStorage({
    destination: uploadsDirectory,
    filename: (_req, file, callback) => {
        const extension = TIPOS_PERMITIDOS[file.mimetype] || '.jpg';
        callback(null, `solicitud-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
    },
});

const upload = multer({
    storage: usaCloudinary() ? multer.memoryStorage() : almacenamientoLocal,
    limits: { fileSize: 10 * 1024 * 1024, files: 15 },
    fileFilter: (_req, file, callback) => {
        if (!TIPOS_PERMITIDOS[file.mimetype]) {
            const error = new Error('Solo se aceptan fotos JPG, PNG, WEBP, GIF o AVIF');
            error.statusCode = 415;
            return callback(error);
        }
        return callback(null, true);
    },
});

const DOCUMENTOS_PERMITIDOS = { ...TIPOS_PERMITIDOS, 'application/pdf': '.pdf' };
const uploadDocumentos = multer({
    storage: usaCloudinary() ? multer.memoryStorage() : almacenamientoLocal,
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, callback) => {
        if (!DOCUMENTOS_PERMITIDOS[file.mimetype]) {
            const error = new Error('Cada documento debe ser PDF o una imagen JPG, PNG, WEBP o GIF');
            error.statusCode = 415;
            return callback(error);
        }
        return callback(null, true);
    },
});

// Subida de fotos de la propiedad por parte del cliente
router.post('/fotos', authMiddleware, (req, res, next) => {
    upload.array('fotos', 15)(req, res, async (error) => {
        if (error) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'Cada foto puede pesar hasta 10 MB' });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(413).json({ message: 'Podés subir hasta 15 fotos por vez' });
            }
            if (error.statusCode === 415) {
                return res.status(415).json({ message: error.message });
            }
            return next(error);
        }

        const archivos = req.files || [];
        if (usaCloudinary()) {
            try {
                const urls = [];
                for (const archivo of archivos) {
                    urls.push(await subirACloudinary(archivo.buffer, archivo.mimetype, archivo.originalname));
                }
                return res.status(201).json({ data: urls });
            } catch (errorSubida) {
                console.error('[imagenes] Error al subir foto a Cloudinary:', errorSubida);
                return res.status(errorSubida.statusCode || 502).json({ message: errorSubida.message });
            }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const urls = archivos.map((file) => `${baseUrl}/uploads/${file.filename}`);
        return res.status(201).json({ data: urls });
    });

    router.post('/documentos', authMiddleware, (req, res, next) => {
        uploadDocumentos.array('documentos', 5)(req, res, async (error) => {
            if (error) {
                if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Cada documento puede pesar hasta 10 MB' });
                if (error.code === 'LIMIT_FILE_COUNT') return res.status(413).json({ message: 'Adjuntá hasta 5 documentos' });
                if (error.statusCode === 415) return res.status(415).json({ message: error.message });
                return next(error);
            }
            try {
                const archivos = req.files || [];
                if (usaCloudinary()) {
                    const urls = [];
                    for (const archivo of archivos) urls.push(await subirACloudinary(archivo.buffer, archivo.mimetype, archivo.originalname));
                    return res.status(201).json({ data: urls });
                }
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                return res.status(201).json({ data: archivos.map((file) => `${baseUrl}/uploads/${file.filename}`) });
            } catch (errorSubida) {
                return res.status(errorSubida.statusCode || 502).json({ message: errorSubida.message });
            }
        });
    });
});

// Rutas de cliente (requiere estar autenticado)
router.post('/', authMiddleware, solicitudPublicacionController.crear);
router.get('/mis-solicitudes', authMiddleware, solicitudPublicacionController.listarMisSolicitudes);

// Rutas de administración
router.get('/', authMiddleware, requireAdmin, solicitudPublicacionController.listarAdmin);
router.get('/:id', authMiddleware, solicitudPublicacionController.obtenerPorId);
router.put('/:id/aprobar', authMiddleware, requireAdmin, solicitudPublicacionController.aprobar);
router.put('/:id/rechazar', authMiddleware, requireAdmin, solicitudPublicacionController.rechazar);

module.exports = router;
