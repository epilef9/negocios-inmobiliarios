// auth.controller.js
// Controlador para endpoints de autenticacion

const mongoose = require('mongoose');
const authService = require('../services/auth.service');
const User = require('../models/user.model');
const Property = require('../models/property.model');

// Registro de nuevo usuario (HU-05). No inicia sesión: primero hay que confirmar el email.
exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({
            message: result.correoEnviado
                ? 'Cuenta creada. Te mandamos un mail para confirmar tu email.'
                : 'Cuenta creada, pero no pudimos enviar el mail de confirmación. Pedí el reenvío desde el ingreso.',
            data: result,
            requiereVerificacion: true,
            correoEnviado: result.correoEnviado,
            enlaceDev: result.enlaceDev,
            user: result.user
        });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status === 500) console.error('[registro] Error inesperado:', error.message);
        res.status(status).json({
            message: status === 500 ? 'No pudimos crear la cuenta. Probá de nuevo en un momento.' : error.message
        });
    }
};

// Confirma el email con el enlace recibido y deja la sesión iniciada
exports.verifyEmail = async (req, res) => {
    try {
        const result = await authService.verifyEmail(req.body && req.body.token);
        res.status(200).json({
            message: 'Email confirmado',
            data: result,
            token: result.token,
            user: result.user
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'No se pudo confirmar el email',
            code: error.code
        });
    }
};

// Vuelve a mandar el enlace de confirmación (respuesta idéntica exista o no la cuenta)
exports.resendVerification = async (req, res) => {
    try {
        const { enlaceDev } = await authService.resendVerification(req.body.email);
        res.status(200).json({
            message: 'Si la cuenta existe y falta confirmarla, te mandamos un nuevo enlace.',
            segundos: 60,
            enlaceDev
        });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status === 500) console.error('[verificacion] Reenvío fallido:', error.message);
        res.status(status).json({
            message: status === 500 ? 'No pudimos enviar el mail. Probá de nuevo en un rato.' : error.message,
            code: error.code,
            segundos: error.segundos
        });
    }
};

// Inicio de sesion (HU-09)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await authService.login(email, password);
        res.status(200).json({
            message: 'Inicio de sesion exitoso',
            data: result,
            token: result.token,
            user: result.user
        });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status === 500) console.error('[login] Error inesperado:', error.message);
        res.status(status).json({
            message: status === 500 ? 'No pudimos iniciar la sesión. Probá de nuevo en un momento.' : error.message,
            code: error.code
        });
    }
};

// Obtener datos del usuario autenticado actual
exports.me = async (req, res) => {
    try {
        const user = req.user;
        const safeUser = {
            id: user._id,
            nombre: user.nombre,
            apellido: user.apellido,
            telefono: user.telefono,
            email: user.email,
            role: user.role,
            emailVerificado: user.emailVerificado !== false,
            checklistRequisitos: user.checklistRequisitos || [],
            favoritos: Array.isArray(user.favoritos) ? user.favoritos.filter(Boolean).map(String) : [],
            preferencias: user.preferencias || { tema: 'light', paleta: 'corporativo' },
            createdAt: user.createdAt
        };
        res.status(200).json({
            data: safeUser,
            user: safeUser
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuario autenticado' });
    }
};

// Obtener checklist del usuario autenticado
exports.getChecklist = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId).select('checklistRequisitos');
        res.status(200).json({
            message: 'Checklist obtenido exitosamente',
            data: (user && user.checklistRequisitos) ? user.checklistRequisitos : []
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el checklist del usuario' });
    }
};

// Actualizar checklist del usuario autenticado de forma atomica
exports.updateChecklist = async (req, res) => {
    try {
        const { checklist } = req.body;
        if (!Array.isArray(checklist)) {
            return res.status(400).json({ message: 'El checklist debe ser una lista de identificadores' });
        }

        // Solo identificadores cortos y una cantidad razonable (evita guardar datos arbitrarios en la cuenta)
        const cleanChecklist = [...new Set(checklist.filter((item) => typeof item === 'string' && item.length <= 80))].slice(0, 200);
        const userId = req.user._id || req.user.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    checklistRequisitos: cleanChecklist,
                    updatedAt: Date.now()
                }
            },
            { new: true }
        ).select('checklistRequisitos');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json({
            message: 'Checklist actualizado exitosamente',
            data: updatedUser.checklistRequisitos || []
        });
    } catch (error) {
        console.error('Error al actualizar checklist en base de datos:', error);
        res.status(500).json({ 
            message: 'Error al actualizar el checklist del usuario'
        });
    }
};

// Favoritos: ?detalle=1 devuelve las propiedades completas; si no, solo los ids
// Lista de favoritos como strings, tolerando usuarios viejos sin el campo o con un valor que no es lista
const idsDeFavoritos = (valor) => (Array.isArray(valor) ? valor.filter(Boolean).map(String) : []);

// En desarrollo se devuelve el motivo real para poder diagnosticar desde el navegador
const detalleError = (error) => (process.env.NODE_ENV === 'production' ? undefined : error.message);

exports.getFavoritos = async (req, res) => {
    try {
        const conDetalle = req.query.detalle === '1';
        const user = await User.findById(req.user._id).select('favoritos').lean();
        const ids = idsDeFavoritos(user && user.favoritos);
        if (!conDetalle) {
            return res.status(200).json({ data: ids });
        }
        // Se respeta el orden en que se guardaron y se descartan las propiedades eliminadas
        const propiedades = await Property.find({ _id: { $in: ids } }).lean();
        const porId = new Map(propiedades.map((p) => [String(p._id), p]));
        res.status(200).json({ data: ids.map((id) => porId.get(id)).filter(Boolean) });
    } catch (error) {
        console.error('[favoritos] Error al obtener:', error);
        res.status(500).json({ message: 'No se pudieron obtener los favoritos', errors: [detalleError(error)].filter(Boolean) });
    }
};

// Guarda la lista completa: funciona aunque el campo no exista o tenga otro formato
const guardarFavoritos = async (userId, cambiar) => {
    const user = await User.findById(userId).select('favoritos').lean();
    const ids = cambiar(idsDeFavoritos(user && user.favoritos));
    await User.updateOne(
        { _id: userId },
        { $set: { favoritos: ids.map((id) => new mongoose.Types.ObjectId(id)), updatedAt: Date.now() } }
    );
    return ids;
};

exports.agregarFavorito = async (req, res) => {
    const { propertyId } = req.params;
    if (!mongoose.isValidObjectId(propertyId)) {
        return res.status(400).json({ message: 'El id de la propiedad no es válido' });
    }
    try {
        const existe = await Property.exists({ _id: propertyId });
        if (!existe) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        const ids = await guardarFavoritos(req.user._id, (actuales) =>
            actuales.includes(propertyId) ? actuales : [...actuales, propertyId]
        );
        res.status(200).json({ data: ids });
    } catch (error) {
        console.error('[favoritos] Error al guardar:', error);
        res.status(500).json({ message: 'No se pudo guardar el favorito', errors: [detalleError(error)].filter(Boolean) });
    }
};

exports.quitarFavorito = async (req, res) => {
    const { propertyId } = req.params;
    if (!mongoose.isValidObjectId(propertyId)) {
        return res.status(400).json({ message: 'El id de la propiedad no es válido' });
    }
    try {
        const ids = await guardarFavoritos(req.user._id, (actuales) => actuales.filter((id) => id !== propertyId));
        res.status(200).json({ data: ids });
    } catch (error) {
        console.error('[favoritos] Error al quitar:', error);
        res.status(500).json({ message: 'No se pudo quitar el favorito', errors: [detalleError(error)].filter(Boolean) });
    }
};

// Cierre de sesion
exports.logout = (req, res) => {
    res.status(200).json({ message: 'Cierre de sesion exitoso' });
};

// Obtener preferencias visuales del usuario autenticado
exports.getPreferences = async (req, res) => {
    const preferencias = req.user.preferencias || { tema: 'light', paleta: 'corporativo' };
    res.status(200).json({ data: preferencias });
};

// Guardar preferencias visuales del usuario autenticado
exports.updatePreferences = async (req, res) => {
    const { tema, paleta } = req.body || {};
    if (!['light', 'dark'].includes(tema) || typeof paleta !== 'string' || !paleta.trim()) {
        return res.status(400).json({ message: 'Las preferencias visuales no son válidas' });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { 'preferencias.tema': tema, 'preferencias.paleta': paleta, updatedAt: Date.now() } },
            { new: true }
        ).select('preferencias');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json({ data: updatedUser.preferencias });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar las preferencias visuales' });
    }
};
// Pedir el enlace para elegir contraseña nueva (respuesta idéntica exista o no la cuenta)
exports.olvidePassword = async (req, res) => {
    try {
        const { enlaceDev } = await authService.solicitarRestablecimiento(req.body.email);
        res.status(200).json({
            message: 'Si hay una cuenta con ese email, te mandamos un enlace para elegir una contraseña nueva.',
            enlaceDev
        });
    } catch (error) {
        console.error('[contraseña] No se pudo mandar el enlace:', error.message);
        res.status(500).json({ message: 'No pudimos mandar el mail. Probá de nuevo en un rato.' });
    }
};

// Guardar la contraseña nueva con el enlace del mail
exports.restablecerPassword = async (req, res) => {
    try {
        const { token, password } = req.body || {};
        const resultado = await authService.restablecerPassword(token, password);
        res.status(200).json({ message: 'Listo, tu contraseña cambió. Ingresá con la nueva.', data: resultado });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status === 500) console.error('[contraseña] Error al restablecer:', error.message);
        res.status(status).json({
            message: status === 500 ? 'No se pudo cambiar la contraseña. Probá de nuevo.' : error.message,
            code: error.code
        });
    }
};

// Confirmar el email nuevo con el enlace que llegó a esa casilla
exports.confirmarCambioEmail = async (req, res) => {
    try {
        const resultado = await authService.confirmarCambioEmail(req.body && req.body.token);
        res.status(200).json({ message: 'Email actualizado', data: resultado, token: resultado.token, user: resultado.user });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status === 500) console.error('[email] Error al confirmar el cambio:', error.message);
        res.status(status).json({
            message: status === 500 ? 'No se pudo confirmar el email. Probá de nuevo.' : error.message,
            code: error.code
        });
    }
};
