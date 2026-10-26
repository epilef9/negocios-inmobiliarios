const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const solicitudPublicacionController = require('../controllers/solicitudPublicacion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { usaCloudinary, subirACloudinary } = require('../services/imagenes.service');
const { requireAdmin } = authMiddleware;
const { frenos } = require('../middlewares/seguridad');
const documentosPublicacion = require('../services/documentosPublicacion.service');

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

// Documentos: quedan en memoria solo para cifrarlos y guardarlos en MongoDB (nunca en disco).
// Se suben de a uno: Vercel no acepta pedidos de más de ~4,5 MB.
const uploadDocumentos = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const mime = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
        if (!documentosPublicacion.MIME_PERMITIDOS.includes(mime)) {
            const error = new Error('Cada documento debe ser un PDF o una imagen JPG, PNG o WEBP');
            error.statusCode = 415;
            return callback(error);
        }
        return callback(null, true);
    },
});

// Subida de fotos de la propiedad por parte del cliente
router.post('/fotos', authMiddleware, frenos.uploads, (req, res, next) => {
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
});

// Subida de un documento de la solicitud por parte del cliente: se cifra y se guarda en MongoDB
router.post('/documentos', authMiddleware, frenos.uploads, (req, res, next) => {
    uploadDocumentos.array('documentos', 1)(req, res, async (error) => {
        if (error) {
            if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Cada documento puede pesar hasta 4 MB' });
            if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: 'Subí los documentos de a uno' });
            if (error.statusCode === 415) return res.status(415).json({ message: error.message });
            return next(error);
        }
        const archivos = req.files || [];
        if (!archivos.length) return res.status(400).json({ message: 'No llegó ningún documento' });
        try {
            return res.status(201).json({ data: await documentosPublicacion.guardar(archivos, req.user._id) });
        } catch (errorSubida) {
            if (errorSubida.statusCode) return res.status(errorSubida.statusCode).json({ message: errorSubida.message });
            console.error('[publicaciones] No se pudo guardar un documento:', errorSubida.message);
            return res.status(500).json({ message: 'No pudimos guardar el documento. Probá de nuevo en un momento.' });
        }
    });
});

// Descarga de un documento: solo el administrador o quien lo subió
router.get('/documentos/:id', authMiddleware, solicitudPublicacionController.obtenerDocumento);

// Rutas de cliente (requiere estar autenticado)
router.post('/', authMiddleware, solicitudPublicacionController.crear);
router.get('/mis-solicitudes', authMiddleware, solicitudPublicacionController.listarMisSolicitudes);

// Rutas de administración
router.get('/', authMiddleware, requireAdmin, solicitudPublicacionController.listarAdmin);
router.get('/:id', authMiddleware, solicitudPublicacionController.obtenerPorId);
router.put('/:id/aprobar', authMiddleware, requireAdmin, solicitudPublicacionController.aprobar);
router.put('/:id/rechazar', authMiddleware, requireAdmin, solicitudPublicacionController.rechazar);

module.exports = router;
