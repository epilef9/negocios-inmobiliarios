const ContratoRepository = require('../repositories/contratos.repository');

class ContratoService {
    async createContrato(data) {
        return await ContratoRepository.create(data);
    }

    async getAllContratos(filters = {}) {
        return await ContratoRepository.findAll(filters);
    }

    async getContratoById(id) {
        return await ContratoRepository.findById(id);
    }

    async updateContrato(id, data) {
        return await ContratoRepository.update(id, data);
    }

    async deleteContrato(id) {
        return await ContratoRepository.delete(id);
    }
}

module.exports = new ContratoService();
