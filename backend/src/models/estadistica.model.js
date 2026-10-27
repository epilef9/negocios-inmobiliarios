const mongoose = require('mongoose');

// Contadores por propiedad y por día (222). Sin datos de quien mira: solo cuántas veces pasó cada cosa.
const estadisticaSchema = new mongoose.Schema(
    {
        propiedad: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
        dia: { type: String, required: true }, // "AAAA-MM-DD" en hora de Argentina
        vistas: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        visitas: { type: Number, default: 0 },
        favoritos: { type: Number, default: 0 },
        solicitudes: { type: Number, default: 0 },
    },
    { versionKey: false }
);

estadisticaSchema.index({ propiedad: 1, dia: 1 }, { unique: true });
estadisticaSchema.index({ dia: 1 });

module.exports = mongoose.models.Estadistica || mongoose.model('Estadistica', estadisticaSchema, 'estadisticas');
