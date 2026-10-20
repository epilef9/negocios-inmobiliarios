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
const almacenamientoLocal = multer.diskStorage({
		destination: uploadsDirectory,
		filename: (_req, file, callback) => {
			const extension = path.extname(file.originalname).toLowerCase();
			callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
		},
});

const upload = multer({
	storage: usaCloudinary() ? multer.memoryStorage() : almacenamientoLocal,
	limits: { fileSize: 20 * 1024 * 1024, files: 20 },
	fileFilter: (_req, file, callback) => {
		if (!file.mimetype.startsWith('image/')) {
			return callback(new Error('Solo se permiten archivos de imagen'));
		}

		return callback(null, true);
	},
});

router.post('/images', authMiddleware, requireAdmin, (req, res, next) => {
	upload.array('images', 20)(req, res, async (error) => {
		if (error) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				return res.status(413).json({ message: 'Cada imagen puede pesar hasta 20 MB' });
			}

			if (error.code === 'LIMIT_FILE_COUNT') {
				return res.status(413).json({ message: 'Podés subir hasta 20 imágenes por vez' });
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

router.get('/maps/resolve', propertiesController.resolveMapsLink);

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