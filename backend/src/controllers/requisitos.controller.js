const requisitosService = require('../services/requisitos.service');

exports.listar = async (_req, res, next) => {
    try {
        res.json({ data: await requisitosService.listar() });
    } catch (error) {
        next(error);
    }
};

exports.listarAdmin = async (_req, res, next) => {
    try {
        res.json({ data: await requisitosService.listarAdmin() });
    } catch (error) {
        next(error);
    }
};

exports.crear = async (req, res, next) => {
    try {
        const requisito = await requisitosService.crear(req.body);
        res.status(201).json({ data: requisito });
    } catch (error) {
        next(error);
    }
};

exports.actualizar = async (req, res, next) => {
    try {
        const requisito = await requisitosService.actualizar(req.params.id, req.body);
        if (!requisito) return res.status(404).json({ message: 'Requisito no encontrado' });
        res.json({ data: requisito });
    } catch (error) {
        next(error);
    }
};

exports.eliminar = async (req, res, next) => {
    try {
        const requisito = await requisitosService.eliminar(req.params.id);
        if (!requisito) return res.status(404).json({ message: 'Requisito no encontrado' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
