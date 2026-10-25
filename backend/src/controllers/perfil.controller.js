// Perfil de la persona que inició sesión (cliente o administración).
// Los datos de contacto se editan acá; la contraseña y el email se cambian con un enlace que llega por mail,
// así alguien que encuentra la sesión abierta no puede quedarse con la cuenta.
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const config = require('../config/env');
const emailService = require('../services/email.service');
const authService = require('../services/auth.service');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HORAS_VALIDEZ_CAMBIO_EMAIL = 24;
const digitosDe = (texto) => String(texto || '').replace(/\D/g, '');
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');

const datosPublicos = (user, emailPendiente) => ({
    id: user._id,
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    dni: user.dni || '',
    telefono: user.telefono || '',
    email: user.email,
    emailPendiente: emailPendiente || undefined,
    role: user.role,
    emailVerificado: user.emailVerificado !== false,
    checklistRequisitos: user.checklistRequisitos || [],
    preferencias: user.preferencias || { tema: 'light', paleta: 'corporativo' },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

exports.obtener = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+emailPendiente +cambioEmailExpira');
        const pendiente = user.emailPendiente && user.cambioEmailExpira > new Date() ? user.emailPendiente : undefined;
        res.status(200).json({ data: datosPublicos(user, pendiente) });
    } catch (error) {
        res.status(500).json({ message: 'No se pudieron traer tus datos.' });
    }
};

exports.actualizar = async (req, res) => {
    try {
        const nombre = texto(req.body.nombre);
        const apellido = texto(req.body.apellido);
        const dni = texto(req.body.dni);
        const email = texto(req.body.email).toLowerCase();
        const telefono = texto(req.body.telefono);
        const passwordActual = typeof req.body.passwordActual === 'string' ? req.body.passwordActual : '';

        const errores = {};
        if (!nombre) errores.nombre = 'Escribí tu nombre.';
        else if (nombre.length > 80) errores.nombre = 'Es demasiado largo.';
        if (!apellido) errores.apellido = 'Escribí tu apellido.';
        else if (apellido.length > 80) errores.apellido = 'Es demasiado largo.';
        if (!dni) errores.dni = 'El DNI es obligatorio.';
        else if (!/^\d{7,8}$/.test(dni)) errores.dni = 'El DNI debe tener 7 u 8 dígitos numéricos.';
        if (!email) errores.email = 'El email es obligatorio.';
        else if (!EMAIL.test(email) || email.length > 150) errores.email = 'Ese email no parece válido.';
        if (!telefono) errores.telefono = 'El teléfono es obligatorio.';
        else if (telefono.length > 30 || digitosDe(telefono).length < 8 || digitosDe(telefono).length > 15) {
            errores.telefono = 'Revisá el teléfono: con característica, entre 8 y 15 números.';
        }
        if (Object.keys(errores).length) {
            return res.status(400).json({ message: 'Revisá los datos marcados.', errores });
        }

        const user = await User.findById(req.user._id).select('+emailPendiente +cambioEmailHash +cambioEmailExpira');
        if (!user) return res.status(404).json({ message: 'No encontramos tu cuenta.' });

        user.nombre = nombre;
        user.apellido = apellido;
        user.dni = dni;
        user.telefono = telefono;

        let emailPendiente;
        let enlaceDev;
        if (email !== user.email) {
            // Cambiar el email cambia con qué se ingresa: se confirma con la contraseña y con un enlace al email nuevo
            if (!passwordActual || !(await bcrypt.compare(passwordActual, user.password))) {
                return res.status(400).json({
                    message: 'Para cambiar el email confirmá con tu contraseña actual.',
                    errores: { passwordActual: 'La contraseña no es correcta.' },
                });
            }
            const ocupado = await User.exists({ email, _id: { $ne: user._id } });
            if (ocupado) {
                return res.status(409).json({ message: 'Ese email ya lo usa otra cuenta.', errores: { email: 'Ya hay una cuenta con ese email.' } });
            }
            const token = crypto.randomBytes(32).toString('hex');
            user.emailPendiente = email;
            user.cambioEmailHash = hashDe(token);
            user.cambioEmailExpira = new Date(Date.now() + HORAS_VALIDEZ_CAMBIO_EMAIL * 3600 * 1000);
            await user.save();

            const enlace = `${config.urlFrontend()}/confirmar-email?token=${token}`;
            try {
                const envio = await emailService.enviarCambioEmail({ para: email, nombre: user.nombre, enlace });
                if (envio.simulado) enlaceDev = enlace;
            } catch (error) {
                console.error('[perfil] No se pudo mandar la confirmación del email nuevo:', error.message);
                return res.status(502).json({
                    message: 'Guardamos tus datos, pero no pudimos mandar el mail para confirmar el email nuevo. Probá de nuevo en un rato.',
                    data: { user: datosPublicos(user) },
                });
            }
            emailPendiente = email;
        } else {
            await user.save();
        }

        res.status(200).json({
            message: emailPendiente
                ? `Datos guardados. Te mandamos un mail a ${emailPendiente}: el cambio de email se aplica cuando lo confirmes desde ahí.`
                : 'Datos guardados.',
            data: { user: datosPublicos(user, emailPendiente), emailPendiente, enlaceDev },
        });
    } catch (error) {
        console.error('[perfil] Error al guardar:', error.message);
        res.status(500).json({ message: 'No se pudieron guardar los datos.' });
    }
};

// Cambiar la contraseña desde el perfil: se manda el mismo enlace que en "¿La olvidaste?" al email de la cuenta
exports.pedirCambioPassword = async (req, res) => {
    try {
        const { enlaceDev } = await authService.solicitarRestablecimiento(req.user.email);
        res.status(200).json({
            message: `Te mandamos un mail a ${req.user.email} con un enlace para elegir la contraseña nueva. Vale 30 minutos.`,
            data: { enlaceDev },
        });
    } catch (error) {
        console.error('[perfil] No se pudo mandar el enlace de contraseña:', error.message);
        res.status(500).json({ message: 'No pudimos mandar el mail. Probá de nuevo en un rato.' });
    }
};
