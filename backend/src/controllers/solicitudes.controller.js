const mongoose = require('mongoose');
const { validarSolicitud } = require('../validators/solicitud.validator');
const solicitudesService = require('../services/solicitudes.service');

const MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const CAMPOS_PERSONALES = [
    'nombre', 'apellido', 'dni', 'cuil', 'fechaNacimiento', 'email', 'telefono',
    'domicilio', 'localidad', 'provincia', 'ocupacion', 'ingresosMensuales', 'referencias',
];
const personaPermitida = (persona = {}) => Object.fromEntries(
    CAMPOS_PERSONALES.map((campo) => [campo, typeof persona[campo] === 'string' ? persona[campo].trim() : ''])
);
const verificarFirma = (archivo) => {
    const b = archivo.buffer;
    if (archivo.mimetype === 'application/pdf') return b.subarray(0, 5).toString() === '%PDF-';
    if (archivo.mimetype === 'image/png') return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (archivo.mimetype === 'image/jpeg' || archivo.mimetype === 'image/jpg') return b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
    return false;
};

const archivosPorTipo = (files = {}) => Object.fromEntries(
    Object.entries(files).map(([tipo, archivos]) => [tipo, archivos.map((archivo) => ({
        ...archivo,
        mimetype: archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype,
    }))])
);

const validarArchivos = (files) => {
    const errores = [];
    Object.values(files).flat().forEach((archivo) => {
        if (!MIME_PERMITIDOS.has(archivo.mimetype)) errores.push(`"${archivo.originalname}" debe ser PDF, JPG, JPEG o PNG.`);
        else if (!verificarFirma(archivo)) errores.push(`El contenido de "${archivo.originalname}" no coincide con el formato declarado.`);
    });
    return errores;
};

exports.crear = async (req, res) => {
    let datos;
    try {
        if (typeof req.body.datos !== 'string' || req.body.datos.length > 50000) {
            return res.status(400).json({ message: 'Completá los datos del formulario antes de enviarlo.' });
        }
        datos = JSON.parse(req.body.datos);
    } catch {
        return res.status(400).json({ message: 'Los datos del formulario no tienen un formato válido.' });
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        return res.status(400).json({ message: 'Los datos del formulario no tienen un formato válido.' });
    }

    const { propiedadId, operacion } = datos;
    if (typeof propiedadId !== 'string' || !mongoose.isValidObjectId(propiedadId)) {
        return res.status(400).json({ message: 'La propiedad seleccionada no es válida.' });
    }
    if (!['alquiler', 'compra'].includes(operacion)) return res.status(400).json({ message: 'Elegí alquiler o compra como operación.' });
    const claveIdempotencia = req.get('Idempotency-Key');
    if (typeof claveIdempotencia !== 'string' || !/^[\da-f-]{36}$/i.test(claveIdempotencia)) {
        return res.status(400).json({ message: 'No pudimos identificar el envío. Actualizá la página y volvé a intentarlo.' });
    }

    const archivos = archivosPorTipo(req.files);
    const errores = [...validarSolicitud({ datos, archivos, operacion }), ...validarArchivos(archivos)];
    if (errores.length) return res.status(400).json({ message: 'Revisá la información marcada antes de enviar.', errores });

    const datosCifrables = {
        titular: personaPermitida(datos.titular),
        incluyeCotitular: datos.incluyeCotitular,
        ...(datos.incluyeCotitular ? { cotitular: personaPermitida(datos.cotitular) } : {}),
        ingresosTipo: datos.ingresosTipo,
        ...(operacion === 'alquiler' ? {
            garantia: datos.garantia.tipo === 'propietaria'
                ? {
                    tipo: 'propietaria',
                    localidadPropiedad: datos.garantia.localidadPropiedad.trim(),
                    provinciaPropiedad: 'Entre Ríos',
                    garante: personaPermitida(datos.garantia.garante),
                }
                : { tipo: 'caucion' },
        } : {}),
    };

    try {
        const { solicitud, repetida } = await solicitudesService.crear({
            usuario: req.user._id,
            propiedadId,
            operacion,
            datos: datosCifrables,
            archivos,
            claveIdempotencia,
        });
        return res.status(repetida ? 200 : 201).json({
            data: { id: String(solicitud._id), estado: solicitud.estado, createdAt: solicitud.createdAt },
            message: 'Solicitud registrada correctamente.',
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[solicitudes] No se pudo registrar la solicitud:', error);
        return res.status(500).json({ message: 'No pudimos guardar la solicitud. Probá de nuevo en un momento.' });
    }
};

exports.listarMias = async (req, res) => {
    try {
        return res.status(200).json({ data: await solicitudesService.listarMias(req.user._id) });
    } catch (error) {
        console.error('[solicitudes] No se pudieron recuperar las solicitudes del cliente:', error);
        return res.status(500).json({ message: 'No se pudieron recuperar tus solicitudes.' });
    }
};

exports.listarAdmin = async (_req, res) => {
    try {
        return res.status(200).json({ data: await solicitudesService.listarAdmin() });
    } catch (error) {
        console.error('[solicitudes] No se pudieron recuperar las solicitudes administrativas:', error);
        return res.status(500).json({ message: 'No se pudieron recuperar las solicitudes.' });
    }
};

exports.obtener = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    try {
        const solicitud = await solicitudesService.obtenerPorId(req.params.id, req.user._id, req.user.role === 'admin');
        if (!solicitud) return res.status(404).json({ message: 'No encontramos esa solicitud.' });
        return res.status(200).json({ data: solicitud });
    } catch (error) {
        console.error('[solicitudes] No se pudo recuperar la solicitud:', error);
        return res.status(500).json({ message: 'No se pudo recuperar la solicitud.' });
    }
};

exports.actualizarEstado = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    const { estado, comentario, reutilizarComentario } = req.body || {};
    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
        return res.status(400).json({ message: 'Elegí un estado válido para la solicitud.' });
    }
    if (comentario !== undefined && typeof comentario !== 'string') {
        return res.status(400).json({ message: 'El comentario debe ser texto.' });
    }
    if (reutilizarComentario !== undefined && typeof reutilizarComentario !== 'boolean') {
        return res.status(400).json({ message: 'La opción para reutilizar el comentario no es válida.' });
    }
    const comentarioLimpio = typeof comentario === 'string' ? comentario.trim() : '';
    if (comentarioLimpio.length > 1000) {
        return res.status(400).json({ message: 'El comentario no puede superar los 1000 caracteres.' });
    }
    if (reutilizarComentario && (!['pendiente', 'rechazada'].includes(estado) || comentarioLimpio)) {
        return res.status(400).json({ message: 'El comentario guardado solo puede reutilizarse en un cambio pendiente o rechazado.' });
    }
    if (['pendiente', 'rechazada'].includes(estado) && !comentarioLimpio && !reutilizarComentario) {
        return res.status(400).json({ message: 'Ingresá un comentario para mantener pendiente o rechazar la solicitud.' });
    }

    try {
        const solicitud = await solicitudesService.actualizarEstado({
            id: req.params.id,
            estado,
            comentario: comentarioLimpio,
            reutilizarComentario: reutilizarComentario === true,
            administradoPor: req.user._id,
        });
        return res.status(200).json({ data: solicitud, message: 'Estado de la solicitud actualizado.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[solicitudes] No se pudo actualizar el estado de una solicitud administrativa:', error.name || 'Error');
        return res.status(500).json({ message: 'No se pudo actualizar el estado de la solicitud.' });
    }
};

exports.agregarComentario = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    const { comentario } = req.body || {};
    if (typeof comentario !== 'string') {
        return res.status(400).json({ message: 'El comentario debe ser texto.' });
    }
    const comentarioLimpio = comentario.trim();
    if (!comentarioLimpio) {
        return res.status(400).json({ message: 'Ingresá un comentario antes de guardarlo.' });
    }
    if (comentarioLimpio.length > 1000) {
        return res.status(400).json({ message: 'El comentario no puede superar los 1000 caracteres.' });
    }

    try {
        const solicitud = await solicitudesService.agregarComentario({
            id: req.params.id,
            comentario: comentarioLimpio,
            administradoPor: req.user._id,
        });
        return res.status(200).json({ data: solicitud, message: 'Comentario agregado al historial.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[solicitudes] No se pudo agregar un comentario administrativo:', error.name || 'Error');
        return res.status(500).json({ message: 'No se pudo agregar el comentario a la solicitud.' });
    }
};

exports.actualizarArchivado = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    const { archivada } = req.body || {};
    if (typeof archivada !== 'boolean') {
        return res.status(400).json({ message: 'Indicá si la solicitud debe archivarse o restaurarse.' });
    }

    try {
        const solicitud = await solicitudesService.actualizarArchivado({
            id: req.params.id,
            archivada,
            administradoPor: req.user._id,
        });
        return res.status(200).json({
            data: solicitud,
            message: archivada ? 'Solicitud archivada correctamente.' : 'Solicitud restaurada correctamente.',
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[solicitudes] No se pudo actualizar el archivado:', error.name || 'Error');
        return res.status(500).json({ message: 'No se pudo actualizar el archivado de la solicitud.' });
    }
};

exports.eliminarDefinitivamente = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    try {
        await solicitudesService.eliminarDefinitivamente(req.params.id);
        return res.status(200).json({ data: { id: req.params.id }, message: 'Solicitud eliminada definitivamente.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('[solicitudes] No se pudo eliminar definitivamente una solicitud:', error.name || 'Error');
        return res.status(500).json({ message: 'No se pudo eliminar la solicitud de forma segura.' });
    }
};

exports.notificacionesAdmin = async (_req, res) => {
    try {
        return res.status(200).json({ data: await solicitudesService.listarNotificacionesAdmin() });
    } catch (error) {
        console.error('[solicitudes] No se pudieron recuperar las notificaciones:', error);
        return res.status(500).json({ message: 'No se pudieron recuperar las notificaciones de solicitudes.' });
    }
};

exports.documento = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'El id de la solicitud no es válido.' });
    try {
        const documento = await solicitudesService.obtenerDocumento(
            req.params.id,
            req.user._id,
            req.user.role === 'admin',
            req.params.tipo
        );
        if (!documento) return res.status(404).json({ message: 'No encontramos ese documento.' });

        res.set({
            'Content-Type': documento.mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(documento.nombre)}"`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        });
        return res.status(200).send(documento.contenido);
    } catch (error) {
        console.error('[solicitudes] No se pudo descargar un documento privado:', error);
        return res.status(500).json({ message: 'No se pudo descargar el documento.' });
    }
};
