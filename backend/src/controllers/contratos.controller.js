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
        res.status(isDuplicate ? 409 : 400).json({
            message: isDuplicate ? 'Ya existe un contrato con ese número' : 'Error al crear el contrato',
            error,
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
        res.status(400).json({ message: 'Error al actualizar el contrato', error });
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
