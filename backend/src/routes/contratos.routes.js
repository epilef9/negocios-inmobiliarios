const express = require('express');
const router = express.Router();
const contratosController = require('../controllers/contratos.controller');

// Obtener todos los contratos (acepta ?estado=activo|finalizado|cancelado|por_vencer|borrador)
router.get('/', contratosController.getAllContratos);

// Obtener un contrato específico
router.get('/:id', contratosController.getContratoById);

// Crear un nuevo contrato
router.post('/', contratosController.createContrato);

// Actualizar un contrato existente
router.put('/:id', contratosController.updateContrato);

// Eliminar un contrato
router.delete('/:id', contratosController.deleteContrato);

module.exports = router;
