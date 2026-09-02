const Client = require('../models/client.model');

class ClientRepository {
    async create(clientData) {
        const client = new Client(clientData);
        return await client.save();
    }

    async findAll() {
        return await Client.find();
    }

    async findById(clientId) {
        return await Client.findById(clientId);
    }

    async update(clientId, clientData) {
        return await Client.findByIdAndUpdate(clientId, clientData, { new: true });
    }

    async delete(clientId) {
        return await Client.findByIdAndDelete(clientId);
    }
}

module.exports = new ClientRepository();