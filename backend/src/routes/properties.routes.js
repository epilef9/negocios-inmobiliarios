const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const propertiesController = require('../controllers/properties.controller');
const { validateProperty, validatePropertyId } = require('../validators/property.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const { usaCloudinary, subirACloudinary } = require('../services/imagenes.service');
const requireAdmin = authMiddleware.requireAdmin;

const router = express.Router();

const uploadsDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

// Con Cloudinary las fotos quedan en memoria hasta subirlas; sin Cloudinary van a la carpeta uploads
// Solo formatos de foto comunes. La extensión del archivo guardado sale del tipo, nunca del nombre que manda
// el navegador: así no se puede subir una página .html o un .svg con código disfrazado de imagen.
const TIPOS_PERMITIDOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

const almacenamientoLocal = multer.diskStorage({
		destination: uploadsDirectory,
		filename: (_req, file, callback) => {
			const extension = TIPOS_PERMITIDOS[file.mimetype] || '.jpg';
			callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
		},
});

const upload = multer({
	storage: usaCloudinary() ? multer.memoryStorage() : almacenamientoLocal,
	// 10 MB es el máximo por foto del plan gratis de Cloudinary
	limits: { fileSize: 10 * 1024 * 1024, files: 20 },
	fileFilter: (_req, file, callback) => {
		if (!TIPOS_PERMITIDOS[file.mimetype]) {
			const error = new Error('Solo se aceptan fotos JPG, PNG, WEBP, GIF o AVIF');
			error.statusCode = 415;
			return callback(error);
		}

		return callback(null, true);
	},
});

router.post('/images', authMiddleware, requireAdmin, (req, res, next) => {
	upload.array('images', 20)(req, res, async (error) => {
		if (error) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				return res.status(413).json({ message: 'Cada foto puede pesar hasta 10 MB' });
			}

			if (error.code === 'LIMIT_FILE_COUNT') {
				return res.status(413).json({ message: 'Podés subir hasta 20 imágenes por vez' });
			}

			if (error.statusCode === 415) {
				return res.status(415).json({ message: error.message });
			}

			return next(error);
		}

		const archivos = req.files || [];
		if (usaCloudinary()) {
			try {
				// De a una para no superar los límites del plan gratis
				const images = [];
				for (const archivo of archivos) {
					images.push(await subirACloudinary(archivo.buffer, archivo.mimetype, archivo.originalname));
				}
				return res.status(201).json({ data: images });
			} catch (errorSubida) {
				console.error('[imagenes] Error al subir a Cloudinary:', errorSubida);
				return res.status(errorSubida.statusCode || 502).json({ message: errorSubida.message });
			}
		}

		const baseUrl = `${req.protocol}://${req.get('host')}`;
		const images = archivos.map((file) => `${baseUrl}/uploads/${file.filename}`);
		return res.status(201).json({ data: images });
	});
});

// Leer coordenadas de un link de Google Maps: lo usa el formulario del panel
router.get('/maps/resolve', authMiddleware, requireAdmin, propertiesController.resolveMapsLink);

// Obtener todas las propiedades
router.get('/', propertiesController.getAllProperties);

// Reordenar propiedades (solo administrador)
router.patch('/reorder', authMiddleware, requireAdmin, propertiesController.reorderProperties);

// Obtener una propiedad específica
router.get('/:id', validatePropertyId, propertiesController.getPropertyById);

// Crear una nueva propiedad (solo administrador)
router.post('/', authMiddleware, requireAdmin, validateProperty, propertiesController.createProperty);

// Actualizar una propiedad existente (solo administrador)
router.put('/:id', authMiddleware, requireAdmin, validatePropertyId, validateProperty, propertiesController.updateProperty);

// Eliminar una propiedad (solo administrador)
router.delete('/:id', authMiddleware, requireAdmin, validatePropertyId, propertiesController.deleteProperty);

module.exports = router;