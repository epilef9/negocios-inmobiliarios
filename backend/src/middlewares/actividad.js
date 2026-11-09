const actividad = require('../services/actividad.service');

// Registra en la actividad del panel lo que hizo quien tiene la sesión, cuando el pedido salió bien (2xx).
// accion y detalle pueden ser un texto o una función (req) => texto. El id sale de req.params.id o, al crear, de la respuesta.
const registra = (entidad, accion, { detalle } = {}) => (req, res, next) => {
    let cuerpo;
    const json = res.json.bind(res);
    res.json = (datos) => {
        cuerpo = datos;
        return json(datos);
    };
    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300 || !req.user) return;
        const resolver = (v) => (typeof v === 'function' ? v(req, cuerpo) : v);
        const entidadId = req.params.id || cuerpo?.data?._id || cuerpo?.data?.id || null;
        actividad.registrar(req.user, { entidad, entidadId, accion: resolver(accion), detalle: resolver(detalle) });
    });
    next();
};

module.exports = { registra };
