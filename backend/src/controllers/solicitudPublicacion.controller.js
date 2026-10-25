const solicitudPublicacionService = require('../services/solicitudPublicacion.service');

exports.crear = async (req, res) => {
    try {
        const solicitud = await solicitudPublicacionService.crear(req.user._id, req.body);
        res.status(201).json({
            message: 'Tu solicitud de publicación fue enviada con éxito. La revisaremos a la brevedad.',
            data: solicitud,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al enviar la solicitud de publicación.',
        });
    }
};

exports.listarMisSolicitudes = async (req, res) => {
    try {
        const solicitudes = await solicitudPublicacionService.listarMisSolicitudes(req.user._id);
        res.status(200).json({
            data: solicitudes,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al obtener tus solicitudes.',
        });
    }
};

exports.listarAdmin = async (req, res) => {
    try {
        const { estado } = req.query;
        const solicitudes = await solicitudPublicacionService.listarAdmin({ estado });
        res.status(200).json({
            data: solicitudes,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al listar las solicitudes de publicación.',
        });
    }
};

exports.obtenerPorId = async (req, res) => {
    try {
        const solicitud = await solicitudPublicacionService.obtenerPorId(req.params.id, req.user);
        res.status(200).json({
            data: solicitud,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al obtener la solicitud.',
        });
    }
};

exports.aprobar = async (req, res) => {
    try {
        const resultado = await solicitudPublicacionService.aprobar(req.params.id, req.user._id);
        res.status(200).json({
            message: 'Solicitud aprobada y propiedad creada exitosamente en el catálogo.',
            data: resultado.solicitud,
            propiedadId: resultado.propiedadId,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al aprobar la solicitud de publicación.',
        });
    }
};

exports.rechazar = async (req, res) => {
    try {
        const { motivo } = req.body;
        const solicitud = await solicitudPublicacionService.rechazar(req.params.id, motivo, req.user._id);
        res.status(200).json({
            message: 'Solicitud rechazada y motivo notificado al cliente.',
            data: solicitud,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Error al rechazar la solicitud de publicación.',
        });
    }
};
