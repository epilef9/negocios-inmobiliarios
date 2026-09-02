// Middleware para manejar errores en la aplicación

const apiError = require('../utils/api-error');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log del error (puede ser mejorado para usar un logger)
    console.error(err);

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
    });
};

const notFoundHandler = (req, res, next) => {
    const error = new apiError('Not Found', 404);
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};