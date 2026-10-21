// Perfil de la persona que inició sesión (cliente o administración): ver y editar sus datos y cambiar la contraseña.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/env');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Teléfono: dígitos con espacios, guiones, paréntesis o + opcional; entre 8 y 15 dígitos
const digitosDe = (texto) => String(texto || '').replace(/\D/g, '');
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const datosPublicos = (user) => ({
    id: user._id,
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    telefono: user.telefono || '',
    email: user.email,
    role: user.role,
    checklistRequisitos: user.checklistRequisitos || [],
    preferencias: user.preferencias || { tema: 'light', paleta: 'corporativo' },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// El token lleva el email y el nombre: si cambian, se entrega uno nuevo para que la sesión quede al día
const nuevoToken = (user) => {
    const secreto = config.jwtSecret();
    if (!secreto) throw new Error('JWT_SECRET no está configurada');
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role, nombre: user.nombre, apellido: user.apellido },
        secreto,
        { expiresIn: '24h' }
    );
};

exports.obtener = (req, res) => {
    res.status(200).json({ data: datosPublicos(req.user) });
};

exports.actualizar = async (req, res) => {
    try {
        const nombre = texto(req.body.nombre);
        const apellido = texto(req.body.apellido);
        const email = texto(req.body.email).toLowerCase();
        const telefono = texto(req.body.telefono);
        const passwordActual = typeof req.body.passwordActual === 'string' ? req.body.passwordActual : '';

        const errores = {};
        if (!nombre) errores.nombre = 'Escribí tu nombre.';
        if (!apellido) errores.apellido = 'Escribí tu apellido.';
        if (!email) errores.email = 'El email es obligatorio.';
        else if (!EMAIL.test(email)) errores.email = 'Ese email no parece válido.';
        if (!telefono) errores.telefono = 'El teléfono es obligatorio.';
        else if (digitosDe(telefono).length < 8 || digitosDe(telefono).length > 15) errores.telefono = 'Revisá el teléfono: con característica, entre 8 y 15 números.';
        if (Object.keys(errores).length) {
            return res.status(400).json({ message: 'Revisá los datos marcados.', errores });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'No encontramos tu cuenta.' });

        const cambiaEmail = email !== user.email;
        if (cambiaEmail) {
            // Cambiar el email cambia con qué se inicia sesión: se pide la contraseña para confirmar que es la persona
            if (!passwordActual || !(await bcrypt.compare(passwordActual, user.password))) {
                return res.status(400).json({ message: 'Para cambiar el email confirmá con tu contraseña actual.', errores: { passwordActual: 'La contraseña no es correcta.' } });
            }
            const ocupado = await User.exists({ email, _id: { $ne: user._id } });
            if (ocupado) {
                return res.status(409).json({ message: 'Ese email ya está en uso por otra cuenta.', errores: { email: 'Ya hay una cuenta con ese email.' } });
            }
            user.email = email;
            if (!user.username || user.username.includes('@')) user.username = email;
        }

        user.nombre = nombre;
        user.apellido = apellido;
        user.telefono = telefono;
        await user.save();

        res.status(200).json({ data: { user: datosPublicos(user), token: nuevoToken(user) }, message: 'Datos guardados.' });
    } catch (error) {
        res.status(500).json({ message: 'No se pudieron guardar los datos.' });
    }
};

exports.cambiarPassword = async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body || {};
        if (typeof passwordActual !== 'string' || !passwordActual) {
            return res.status(400).json({ message: 'Escribí tu contraseña actual.', errores: { passwordActual: 'Escribí tu contraseña actual.' } });
        }
        if (typeof passwordNueva !== 'string' || passwordNueva.length < 8) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.', errores: { passwordNueva: 'Mínimo 8 caracteres.' } });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'No encontramos tu cuenta.' });
        if (!(await bcrypt.compare(passwordActual, user.password))) {
            return res.status(400).json({ message: 'La contraseña actual no es correcta.', errores: { passwordActual: 'La contraseña no es correcta.' } });
        }
        if (await bcrypt.compare(passwordNueva, user.password)) {
            return res.status(400).json({ message: 'La nueva contraseña tiene que ser distinta de la actual.', errores: { passwordNueva: 'Es igual a la actual.' } });
        }

        user.password = await bcrypt.hash(passwordNueva, 10);
        await user.save();
        res.status(200).json({ message: 'Contraseña actualizada.' });
    } catch (error) {
        res.status(500).json({ message: 'No se pudo cambiar la contraseña.' });
    }
};
