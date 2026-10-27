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
            // Se escapa lo que escribe el administrador para que no se interprete como expresión regular
            const regex = new RegExp(String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), 'i');
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

    async updateVisita(id, data, { session = null } = {}) {
        return Visita.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after', new: true, runValidators: false, session }
        );
    }

    // Visitas de un cliente: las pedidas con su cuenta y, de antes de guardar la cuenta, las que traen su email
    async getVisitasDeUsuario(usuarioId, email) {
        const condiciones = [{ usuario: usuarioId }];
        if (email) condiciones.push({ usuario: null, 'cliente.email': String(email).toLowerCase().trim() });
        return Visita.find({ $or: condiciones }).sort({ createdAt: -1 }).lean();
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
