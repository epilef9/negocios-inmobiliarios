const Contrato = require('../models/contrato.model');

// Datos personales que solo se piden al abrir un contrato en el panel (nunca en los listados).
const CAMPOS_PROTEGIDOS = [
    '+cliente.dni',
    '+cliente.cuil',
    '+cliente.domicilio',
    '+cotitular.dni',
    '+cotitular.cuil',
    '+cotitular.domicilio',
    '+garante.dni',
    '+garante.cuil',
    '+garante.domicilio',
    '+propietario.dni',
    '+propietario.cuil',
    '+propietario.domicilio',
    '+locadoraDni',
].join(' ');

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
        // Sin select explícito quedan afuera los campos con select:false (DNI, CUIL y domicilios).
        return await Contrato.find(query).sort({ createdAt: -1 });
    }

    async findById(id) {
        return await Contrato.findById(id).select(CAMPOS_PROTEGIDOS);
    }

    async findByNumero(numeroContrato) {
        return await Contrato.findOne({ numeroContrato });
    }

    async update(id, data) {
        // Usamos $set para actualizaciones parciales seguras.
        // runValidators: false evita que Mongoose valide campos que no se están enviando.
        // No se piden los campos protegidos: el resultado de un PUT no tiene por qué devolverlos.
        return await Contrato.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: false });
    }

    async delete(id) {
        return await Contrato.findByIdAndDelete(id);
    }
}

module.exports = new ContratoRepository();
