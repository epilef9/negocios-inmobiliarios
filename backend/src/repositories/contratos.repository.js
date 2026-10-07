const Contrato = require('../models/contrato.model');

class ContratoRepository {
    async create(data) {
        const contrato = new Contrato(data);
        return await contrato.save();
    }

    async findAll(filters = {}) {
        const query = {};
        if (filters.estado && filters.estado !== 'todos') {
            query.estado = filters.estado;
        }
        return await Contrato.find(query).sort({ createdAt: -1 });
    }

    async findById(id) {
        return await Contrato.findById(id);
    }

    async findByNumero(numeroContrato) {
        return await Contrato.findOne({ numeroContrato });
    }

    async update(id, data) {
        // Usamos $set para actualizaciones parciales seguras.
        // runValidators: false evita que Mongoose valide campos que no se están enviando.
        return await Contrato.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: false });
    }

    async delete(id) {
        return await Contrato.findByIdAndDelete(id);
    }
}

module.exports = new ContratoRepository();
