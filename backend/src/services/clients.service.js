// clients.service.js

const Client = require('../models/client.model');
const ClientRepository = require('../repositories/clients.repository');

class ClientService {
    async createClient(clientData) {
        const client = new Client(clientData);
        return await ClientRepository.create(client);
    }

    async getAllClients() {
        return await ClientRepository.findAll();
    }

    async getClientById(clientId) {
        return await ClientRepository.findById(clientId);
    }

    async updateClient(clientId, clientData) {
        return await ClientRepository.update(clientId, clientData);
    }

    async deleteClient(clientId) {
        return await ClientRepository.delete(clientId);
    }
}

module.exports = new ClientService();