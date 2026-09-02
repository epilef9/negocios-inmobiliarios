// users.controller.js

const UserService = require('../services/users.service');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios', error });
    }
};

// Crear un nuevo usuario
exports.createUser = async (req, res) => {
    try {
        const newUser = await UserService.createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear el usuario', error });
    }
};

// Actualizar un usuario existente
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedUser = await UserService.updateUser(id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar el usuario', error });
    }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await UserService.deleteUser(id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario', error });
    }
};