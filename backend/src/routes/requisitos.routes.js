const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const controller = require('../controllers/requisitos.controller');

const router = express.Router();
router.get('/', controller.listar);
router.get('/admin', authMiddleware, authMiddleware.requirePermiso('requisitos'), controller.listarAdmin);
router.post('/', authMiddleware, authMiddleware.requirePermiso('requisitos'), controller.crear);
router.put('/:id', authMiddleware, authMiddleware.requirePermiso('requisitos'), controller.actualizar);
router.delete('/:id', authMiddleware, authMiddleware.requirePermiso('requisitos'), controller.eliminar);

module.exports = router;
