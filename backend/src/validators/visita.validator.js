const mongoose = require('mongoose');

const VALID_ESTADOS = ['pendiente', 'confirmada', 'reprogramada', 'rechazada'];

const validateVisita = (req, res, next) => {
    const errors = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    const { cliente, propiedad, fecha, horario, estado } = req.body;

    if (!isUpdate || cliente !== undefined) {
        if (!cliente || typeof cliente !== 'object') {
            errors.push('Los datos del cliente son obligatorios.');
        } else {
            if (!cliente.nombre || typeof cliente.nombre !== 'string' || !cliente.nombre.trim()) {
                errors.push('El nombre del cliente es obligatorio.');
            }
            if (!cliente.telefono || typeof cliente.telefono !== 'string' || !cliente.telefono.trim()) {
                errors.push('El teléfono del cliente es obligatorio.');
            }
        }
    }

    if (!isUpdate || propiedad !== undefined) {
        if (!propiedad || typeof propiedad !== 'object') {
            errors.push('Los datos de la propiedad son obligatorios.');
        } else {
            if (!propiedad.titulo || typeof propiedad.titulo !== 'string' || !propiedad.titulo.trim()) {
                errors.push('El título de la propiedad es obligatorio.');
            }
        }
    }

    if (!isUpdate || fecha !== undefined) {
        if (!fecha || typeof fecha !== 'string' || !fecha.trim()) {
            errors.push('La fecha de la visita es obligatoria.');
        }
    }

    if (!isUpdate || horario !== undefined) {
        if (!horario || typeof horario !== 'string' || !horario.trim()) {
            errors.push('El horario de la visita es obligatorio.');
        }
    }

    if (estado !== undefined && !VALID_ESTADOS.includes(estado)) {
        errors.push(`El estado debe ser uno de: ${VALID_ESTADOS.join(', ')}.`);
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Datos de visita inválidos', errors });
    }

    next();
};

const validateVisitaId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'El id de la visita no es válido' });
    }
    next();
};

const validateEstadoUpdate = (req, res, next) => {
    const { estado } = req.body;
    if (!estado || !VALID_ESTADOS.includes(estado)) {
        return res.status(400).json({
            message: `El estado es obligatorio y debe ser uno de: ${VALID_ESTADOS.join(', ')}.`,
        });
    }
    next();
};

module.exports = {
    validateVisita,
    validateVisitaId,
    validateEstadoUpdate,
};
