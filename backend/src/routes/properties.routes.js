const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const propertiesController = require('../controllers/properties.controller');
const { validateProperty, validatePropertyId } = require('../validators/property.validator');

const router = express.Router();

const uploadsDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

const upload = multer({
	storage: multer.diskStorage({
		destination: uploadsDirectory,
		filename: (_req, file, callback) => {
			const extension = path.extname(file.originalname).toLowerCase();
			callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
		},
	}),
	limits: { fileSize: 20 * 1024 * 1024, files: 20 },
	fileFilter: (_req, file, callback) => {
		if (!file.mimetype.startsWith('image/')) {
			return callback(new Error('Solo se permiten archivos de imagen'));
		}

		return callback(null, true);
	},
});

router.post('/images', (req, res, next) => {
	upload.array('images', 20)(req, res, (error) => {
		if (error) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				return res.status(413).json({ message: 'Cada imagen puede pesar hasta 20 MB' });
			}

			if (error.code === 'LIMIT_FILE_COUNT') {
				return res.status(413).json({ message: 'Podés subir hasta 20 imágenes por vez' });
			}

			return next(error);
		}

		const baseUrl = `${req.protocol}://${req.get('host')}`;
		const images = (req.files || []).map((file) => `${baseUrl}/uploads/${file.filename}`);
		return res.status(201).json({ data: images });
	});
});

router.get('/maps/resolve', propertiesController.resolveMapsLink);

// Obtener todas las propiedades
router.get('/', propertiesController.getAllProperties);

// Obtener una propiedad específica
router.get('/:id', validatePropertyId, propertiesController.getPropertyById);

// Crear una nueva propiedad
router.post('/', validateProperty, propertiesController.createProperty);

// Actualizar una propiedad existente
router.put('/:id', validatePropertyId, validateProperty, propertiesController.updateProperty);

// Eliminar una propiedad
router.delete('/:id', validatePropertyId, propertiesController.deleteProperty);

module.exports = router;