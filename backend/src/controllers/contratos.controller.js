const mongoose = require('mongoose');
const contratoService = require('../services/contratos.service');

// Obtener todos los contratos (con filtro opcional por estado)
exports.getAllContratos = async (req, res) => {
    try {
        const filters = {};
        if (req.query.estado) filters.estado = req.query.estado;
        const contratos = await contratoService.getAllContratos(filters);
        res.status(200).json({ data: contratos });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los contratos', error });
    }
};

// Solicitudes que el panel puede usar para precargar un contrato (solo admin, por el router)
exports.getSolicitudesParaContrato = async (_req, res) => {
    try {
        const solicitudes = await contratoService.listarSolicitudesParaContrato();
        res.status(200).json({ data: solicitudes });
    } catch (error) {
        console.error('[contratos] No se pudieron recuperar las solicitudes para el contrato:', error.message);
        res.status(500).json({ message: 'No se pudieron obtener las solicitudes.' });
    }
};

// Datos descifrados de una solicitud para completar el formulario del contrato
exports.getDatosDeSolicitud = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    }
    try {
        const datos = await contratoService.datosDesdeSolicitud(req.params.id);
        if (!datos) return res.status(404).json({ message: 'No encontramos esa solicitud.' });
        res.status(200).json({ data: datos });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[contratos] No se pudieron recuperar los datos de la solicitud:', error.message);
        res.status(500).json({ message: 'No se pudieron recuperar los datos de la solicitud.' });
    }
};

// Obtener un contrato por ID
exports.getContratoById = async (req, res) => {
    try {
        const contrato = await contratoService.getContratoById(req.params.id);
        if (!contrato) {
            return res.status(404).json({ message: 'Contrato no encontrado' });
        }
        res.status(200).json({ data: contrato });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el contrato', error });
    }
};

// Crear un nuevo contrato
exports.createContrato = async (req, res) => {
    try {
        const nuevoContrato = await contratoService.createContrato(req.body);
        res.status(201).json({ data: nuevoContrato });
    } catch (error) {
        const isDuplicate = error.code === 11000;
        res.status(error.statusCode || (isDuplicate ? 409 : 400)).json({
            // Se incluye el motivo (por ejemplo, un campo obligatorio vacío) para poder corregirlo desde el panel
            message: isDuplicate ? 'Ya existe un contrato con ese número' : `No se pudo crear el contrato: ${error.message}`,
            errores: error.errores,
        });
    }
};

// Actualizar un contrato existente
exports.updateContrato = async (req, res) => {
    try {
        const contratoActualizado = await contratoService.updateContrato(req.params.id, req.body);
        if (!contratoActualizado) {
            return res.status(404).json({ message: 'Contrato no encontrado' });
        }
        res.status(200).json({ data: contratoActualizado });
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: 'Error al actualizar el contrato', errores: error.errores });
    }
};

// Eliminar un contrato
exports.deleteContrato = async (req, res) => {
    try {
        const contratoEliminado = await contratoService.deleteContrato(req.params.id);
        if (!contratoEliminado) {
            return res.status(404).json({ message: 'Contrato no encontrado' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el contrato', error });
    }
};
