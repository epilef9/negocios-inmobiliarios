const servicio = require('../services/reservasPropiedad.service');

const responder = (res, { status = 200, error, reserva }, mensaje) =>
    error ? res.status(status).json({ message: error }) : res.status(status).json({ data: reserva, message: mensaje });

const conErrores = (accion, fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.error(`Error al ${accion} la reserva con seña:`, error);
        res.status(500).json({ message: `No se pudo ${accion} la reserva` });
    }
};

exports.listar = conErrores('listar', async (req, res) => {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const propiedad = typeof req.query.propiedad === 'string' ? req.query.propiedad : undefined;
    res.status(200).json({ data: await servicio.listar({ estado, propiedad }) });
});

exports.crear = conErrores('crear', async (req, res) => {
    const resultado = await servicio.crear(req.body);
    responder(res, { status: resultado.error ? resultado.status : 201, ...resultado }, 'Reserva registrada: la propiedad figura como reservada.');
});

exports.concretar = conErrores('concretar', async (req, res) => {
    responder(res, await servicio.cerrar(req.params.id, 'concretada', req.body?.cierre), 'Operación concretada.');
});

exports.cancelar = conErrores('cancelar', async (req, res) => {
    responder(res, await servicio.cerrar(req.params.id, 'cancelada', req.body?.cierre), 'Reserva cancelada: la propiedad volvió a estar disponible.');
});

exports.extender = conErrores('extender', async (req, res) => {
    responder(res, await servicio.extender(req.params.id, req.body?.fechaLimite), 'Fecha límite actualizada.');
});
