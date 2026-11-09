const mongoose = require('mongoose');

// Horario de visitas de la oficina (HU-19). Hay un solo documento; si no existe, la agenda usa el horario
// de siempre (ver HORARIO_INICIAL en agenda.service). Horas como texto "HH:MM" y fechas "AAAA-MM-DD".
const tramoSchema = new mongoose.Schema(
    {
        desde: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
        hasta: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    },
    { _id: false }
);

const horarioSchema = new mongoose.Schema(
    {
        // Siete renglones, uno por día: 0 = domingo … 6 = sábado. Sin tramos, ese día no se atiende.
        semana: {
            type: [new mongoose.Schema({ tramos: { type: [tramoSchema], default: [] } }, { _id: false })],
            validate: (dias) => dias.length === 7,
        },
        // Cada cuánto empieza un turno
        duracionMinutos: { type: Number, enum: [15, 30, 45, 60], default: 30 },
        // Feriados y vacaciones: `hasta` inclusive (un feriado es desde = hasta)
        cerrados: {
            type: [
                new mongoose.Schema(
                    {
                        desde: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
                        hasta: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
                        motivo: { type: String, trim: true, maxlength: 100, default: '' },
                    },
                    { _id: false }
                ),
            ],
            default: [],
        },
        // Solo en el documento que hace de candado de la agenda (ver conCandado en agenda.service)
        version: { type: Number },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Horario', horarioSchema);
