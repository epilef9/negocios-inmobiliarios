const mongoose = require('mongoose');

// Noches no disponibles de una propiedad de alquiler temporario.
// Las fechas son texto "AAAA-MM-DD" (sin zona horaria): `desde` es la primera noche ocupada y
// `hasta` el día de salida, que no se cuenta. Así una salida y una entrada el mismo día no chocan.
const disponibilidadSchema = new mongoose.Schema(
    {
        propiedad: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        desde: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
        },
        hasta: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
        },
        // bloqueo: el dueño no la alquila esas noches; ocupada: ya está alquilada por fuera;
        // reserva: la va a usar HU-20 para las reservas hechas desde el sitio
        tipo: {
            type: String,
            enum: ['bloqueo', 'ocupada', 'reserva'],
            default: 'bloqueo',
        },
        // Nota interna del administrador: nunca sale en el endpoint público
        motivo: {
            type: String,
            trim: true,
            maxlength: 200,
            default: '',
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                ret.id = ret._id.toString();
                return ret;
            },
        },
    }
);

// Consultas por propiedad ordenadas por fecha (listado y control de solapamientos)
disponibilidadSchema.index({ propiedad: 1, desde: 1 });

const Disponibilidad = mongoose.model('Disponibilidad', disponibilidadSchema);

module.exports = Disponibilidad;
