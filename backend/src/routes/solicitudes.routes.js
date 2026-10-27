const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const { frenos } = require('../middlewares/seguridad');
const controller = require('../controllers/solicitudes.controller');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 12, fields: 1, parts: 16, fieldSize: 50000 },
    fileFilter: (_req, file, callback) => {
        if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
            const error = new Error('Solo se aceptan documentos PDF, JPG, JPEG o PNG.');
            error.statusCode = 415;
            return callback(error);
        }
        callback(null, true);
    },
});
const archivosSolicitud = upload.fields([
    { name: 'dniTitularFrente', maxCount: 1 },
    { name: 'dniTitularDorso', maxCount: 1 },
    { name: 'cuilTitular', maxCount: 1 },
    { name: 'recibosIngresos', maxCount: 3 },
    { name: 'constanciaIngresos', maxCount: 1 },
    { name: 'domicilio', maxCount: 1 },
    { name: 'dniCotitularFrente', maxCount: 1 },
    { name: 'dniCotitularDorso', maxCount: 1 },
    { name: 'escrituraGarantia', maxCount: 1 },
    { name: 'reciboGarante', maxCount: 1 },
    { name: 'documentacionCaucion', maxCount: 1 },
]);
const procesarArchivos = (req, res, next) => {
    archivosSolicitud(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Cada archivo puede pesar hasta 5 MB.' });
        if (error.code === 'LIMIT_FIELD_VALUE') return res.status(413).json({ message: 'Los datos del formulario no pueden superar los 50 KB.' });
        if (error.code === 'LIMIT_FIELD_COUNT' || error.code === 'LIMIT_PART_COUNT') {
            return res.status(400).json({ message: 'El formulario contiene campos o archivos inesperados.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Revisá los archivos: hay un tipo repetido o demasiados documentos adjuntos.' });
        }
        if (error.statusCode === 415) return res.status(415).json({ message: error.message });
        return next(error);
    });
};

const documentoIndividual = multer({ storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('archivo');
const procesarDocumento = (req, res, next) => documentoIndividual(req, res, (error) => {
    if (!error) return next();
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Cada documento puede pesar hasta 4 MB.' : 'Enviá un solo documento por vez.',
    });
});

router.use(authMiddleware);
router.post('/documentos/:tipo', authMiddleware.requireClient, frenos.documentosSolicitudes, procesarDocumento, controller.subirDocumento);
router.get('/mias', authMiddleware.requireClient, controller.listarMias);
router.get('/admin/notificaciones', authMiddleware.requireAdmin, controller.notificacionesAdmin);
router.get('/admin/pendientes', authMiddleware.requireAdmin, controller.contarPendientes);
router.get('/admin', authMiddleware.requireAdmin, controller.listarAdmin);
router.patch('/:id/estado', authMiddleware.requireAdmin, controller.actualizarEstado);
router.post('/:id/comentarios', authMiddleware.requireAdmin, controller.agregarComentario);
router.patch('/:id/archivo', authMiddleware.requireAdmin, controller.actualizarArchivado);
router.delete('/:id', authMiddleware.requireAdmin, controller.eliminarDefinitivamente);
router.post('/', authMiddleware.requireClient, frenos.solicitudes, procesarArchivos, controller.crear);
router.get('/:id/documentos/:tipo', controller.documento);
router.get('/:id', controller.obtener);

module.exports = router;
