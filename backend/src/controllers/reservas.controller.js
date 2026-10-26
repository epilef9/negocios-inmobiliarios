const reservasService = require('../services/reservas.service');

// Los errores esperados (fechas tomadas, estadía mínima…) traen su código; el resto es un 500
const responderError = (res, error, mensaje) => {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error(`${mensaje}:`, error);
    return res.status(500).json({ message: mensaje });
};

// Cliente: pide una estadía. Queda pendiente y retiene las noches hasta que vence.
exports.crear = async (req, res) => {
    try {
        const { propiedad, entrada, salida, huespedes } = req.body || {};
        const reserva = await reservasService.crearReserva({ usuario: req.user, propiedad, entrada, salida, huespedes });
        return res.status(201).json({ data: reserva, message: 'Reserva enviada. Te avisamos cuando la confirmemos.' });
    } catch (error) {
        return responderError(res, error, 'No se pudo enviar la reserva');
    }
};

exports.mias = async (req, res) => {
    try {
        return res.status(200).json({ data: await reservasService.mias(req.user._id) });
    } catch (error) {
        return responderError(res, error, 'No se pudieron obtener tus reservas');
    }
};

exports.cancelar = async (req, res) => {
    try {
        const reserva = await reservasService.cancelar(req.params.id, req.user._id);
        return res.status(200).json({ data: reserva, message: 'Reserva cancelada. Las noches quedaron libres.' });
    } catch (error) {
        return responderError(res, error, 'No se pudo cancelar la reserva');
    }
};

// Administrador
exports.listar = async (req, res) => {
    try {
        return res.status(200).json({ data: await reservasService.listar({ estado: req.query.estado }) });
    } catch (error) {
        return responderError(res, error, 'No se pudieron obtener las reservas');
    }
};

exports.cantidadPendientes = async (req, res) => {
    try {
        return res.status(200).json({ data: { pendientes: await reservasService.contarPendientes() } });
    } catch (error) {
        return responderError(res, error, 'No se pudieron contar las reservas pendientes');
    }
};

exports.confirmar = async (req, res) => {
    try {
        const reserva = await reservasService.confirmar(req.params.id);
        return res.status(200).json({ data: reserva, message: 'Reserva confirmada' });
    } catch (error) {
        return responderError(res, error, 'No se pudo confirmar la reserva');
    }
};

exports.rechazar = async (req, res) => {
    try {
        const reserva = await reservasService.rechazar(req.params.id, req.body?.motivo);
        return res.status(200).json({ data: reserva, message: 'Reserva rechazada. Las noches quedaron libres.' });
    } catch (error) {
        return responderError(res, error, 'No se pudo rechazar la reserva');
    }
};
