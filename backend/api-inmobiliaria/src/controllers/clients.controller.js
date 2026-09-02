// clients.controller.js

const Client = require('../models/client.model');
const clientService = require('../services/clients.service');

// Obtener todos los clientes
exports.getAllClients = async (req, res) => {
    try {
        const clients = await clientService.getAllClients();
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los clientes', error });
    }
};

// Obtener un cliente por ID
exports.getClientById = async (req, res) => {
    try {
        const client = await clientService.getClientById(req.params.id);
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el cliente', error });
    }
};

// Crear un nuevo cliente
exports.createClient = async (req, res) => {
    try {
        const newClient = await clientService.createClient(req.body);
        res.status(201).json(newClient);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear el cliente', error });
    }
};

// Actualizar un cliente existente
exports.updateClient = async (req, res) => {
    try {
        const updatedClient = await clientService.updateClient(req.params.id, req.body);
        if (!updatedClient) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar el cliente', error });
    }
};

// Eliminar un cliente
exports.deleteClient = async (req, res) => {
    try {
        const deletedClient = await clientService.deleteClient(req.params.id);
        if (!deletedClient) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el cliente', error });
    }
};