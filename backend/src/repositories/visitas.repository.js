const Visita = require('../models/visita.model');

class VisitasRepository {
    async getAllVisitas(filters = {}) {
        const query = {};

        if (filters.estado && filters.estado !== 'todos') {
            query.estado = filters.estado;
        }

        if (filters.fecha && filters.fecha !== 'todas') {
            query.fecha = filters.fecha;
        }

        if (filters.search) {
            const regex = new RegExp(filters.search, 'i');
            query.$or = [
                { 'cliente.nombre': regex },
                { 'cliente.telefono': regex },
                { 'propiedad.titulo': regex },
            ];
        }

        return Visita.find(query).sort({ createdAt: -1 });
    }

    async getVisitaById(id) {
        return Visita.findById(id);
    }

    // Con `session`, dentro de la transacción de la agenda (create con sesión pide un array)
    async createVisita(data, { session } = {}) {
        if (session) return (await Visita.create([data], { session }))[0];
        return Visita.create(data);
    }

    async updateVisita(id, data) {
        return Visita.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after', new: true, runValidators: false }
        );
    }

    async deleteVisita(id) {
        return Visita.findByIdAndDelete(id);
    }

    async countVisitas(filter = {}) {
        return Visita.countDocuments(filter);
    }

    async insertMany(visitas) {
        return Visita.insertMany(visitas);
    }

    async deleteAll() {
        return Visita.deleteMany({});
    }
}

module.exports = new VisitasRepository();
