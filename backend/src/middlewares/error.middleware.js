// Middleware para manejar errores en la aplicación

const apiError = require('../utils/api-error');
const { enProduccion } = require('../config/env');

const errorHandler = (err, req, res, next) => {
    // JSON mal formado o cuerpo demasiado grande (los arma express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'El cuerpo de la solicitud no es un JSON válido' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ status: 'error', statusCode: 413, message: 'La solicitud es demasiado grande' });
    }

    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) console.error(err);

    // En producción un error inesperado no muestra detalles internos (consultas, rutas, versiones)
    const message = statusCode >= 500 && enProduccion()
        ? 'Ocurrió un error en el servidor. Probá de nuevo en un momento.'
        : err.message || 'Internal Server Error';

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
    });
};

const notFoundHandler = (req, res, next) => {
    const error = new apiError(404, 'Not Found');
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
