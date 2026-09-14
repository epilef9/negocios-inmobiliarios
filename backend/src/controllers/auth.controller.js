// auth.controller.js
// Controlador para endpoints de autenticacion

const authService = require('../services/auth.service');

// Registro de nuevo usuario (HU-05)
exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            data: result,
            token: result.token,
            user: result.user
        });
    } catch (error) {
        const status = error.statusCode || 500;
        res.status(status).json({
            message: error.message || 'Error al registrar usuario',
            error: error.message
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
        res.status(status).json({
            message: error.message || 'Error al iniciar sesion',
            error: error.message
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
            checklistRequisitos: user.checklistRequisitos || [],
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
        const user = req.user;
        res.status(200).json({
            message: 'Checklist obtenido exitosamente',
            data: user.checklistRequisitos || []
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el checklist del usuario' });
    }
};

// Actualizar checklist del usuario autenticado
exports.updateChecklist = async (req, res) => {
    try {
        const { checklist } = req.body;
        if (!Array.isArray(checklist)) {
            return res.status(400).json({ message: 'El checklist debe ser una lista de identificadores' });
        }

        const cleanChecklist = checklist.filter((item) => typeof item === 'string');

        const user = req.user;
        user.checklistRequisitos = cleanChecklist;
        await user.save();

        res.status(200).json({
            message: 'Checklist actualizado exitosamente',
            data: user.checklistRequisitos
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el checklist del usuario' });
    }
};

// Cierre de sesion
exports.logout = (req, res) => {
    res.status(200).json({ message: 'Cierre de sesion exitoso' });
};