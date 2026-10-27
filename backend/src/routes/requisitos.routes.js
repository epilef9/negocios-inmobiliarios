const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const controller = require('../controllers/requisitos.controller');

const router = express.Router();
router.get('/', controller.listar);
router.get('/admin', authMiddleware, authMiddleware.requireAdmin, controller.listarAdmin);
router.post('/', authMiddleware, authMiddleware.requireAdmin, controller.crear);
router.put('/:id', authMiddleware, authMiddleware.requireAdmin, controller.actualizar);
router.delete('/:id', authMiddleware, authMiddleware.requireAdmin, controller.eliminar);

module.exports = router;
