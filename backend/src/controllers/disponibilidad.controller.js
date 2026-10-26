const disponibilidadService = require('../services/disponibilidad.service');
const reservasService = require('../services/reservas.service');

// Los errores esperados (id inválido, rango que se pisa…) traen su código; el resto es un 500
const responderError = (res, error, mensaje) => {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error(`${mensaje}:`, error);
    return res.status(500).json({ message: mensaje });
};

// Público: noches ocupadas, estadía mínima y precio por noche (sin datos internos).
// De paso marca como vencidas las reservas de esta propiedad que pasaron su plazo (no hay cron).
exports.getDisponibilidad = async (req, res) => {
    try {
        await reservasService.barrerVencidas({ propiedad: req.params.propiedadId });
        const datos = await disponibilidadService.disponibilidadPublica(req.params.propiedadId);
        // Para que la ficha le diga al cliente cuánto tarda la confirmación
        return res.status(200).json({ data: { ...datos, plazoConfirmacionHoras: reservasService.plazoHoras() } });
    } catch (error) {
        return responderError(res, error, 'No se pudo consultar la disponibilidad');
    }
};

exports.getRangos = async (req, res) => {
    try {
        await reservasService.barrerVencidas({ propiedad: req.params.propiedadId });
        return res.status(200).json({ data: await disponibilidadService.listarRangos(req.params.propiedadId) });
    } catch (error) {
        return responderError(res, error, 'No se pudieron obtener los rangos');
    }
};

exports.createRango = async (req, res) => {
    try {
        const { propiedad, desde, hasta, tipo, motivo } = req.body || {};
        const rango = await disponibilidadService.crearRango({ propiedad, desde, hasta, tipo, motivo });
        return res.status(201).json({ data: rango, message: 'Fechas marcadas como no disponibles' });
    } catch (error) {
        return responderError(res, error, 'No se pudo guardar el rango');
    }
};

exports.deleteRango = async (req, res) => {
    try {
        const borrado = await disponibilidadService.eliminarRango(req.params.id);
        if (!borrado) return res.status(404).json({ message: 'Rango no encontrado' });
        return res.status(200).json({ message: 'Fechas liberadas' });
    } catch (error) {
        return responderError(res, error, 'No se pudo borrar el rango');
    }
};
