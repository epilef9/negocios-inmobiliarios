const mongoose = require('mongoose');

// Enlaces de los mails de una visita para quien no tiene cuenta (gestionar la visita, confirmar asistencia).
// Del token solo se guarda el hash: si alguien lee la base, no puede armar el enlace.
const tokenVisitaSchema = new mongoose.Schema(
    {
        visita: { type: mongoose.Schema.Types.ObjectId, ref: 'Visita', required: true, index: true },
        proposito: { type: String, enum: ['gestion', 'asistencia'], required: true },
        hash: { type: String, required: true, unique: true },
        // Cuando empieza la visita. El índice TTL borra solo los vencidos
        expira: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
        // Si la visita cambia de estado (la confirman, la rechazan, la cancela), el enlace deja de valer
        estadoAlEmitir: { type: String, required: true },
        unSoloUso: { type: Boolean, default: false },
        usadoAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('TokenVisita', tokenVisitaSchema);
