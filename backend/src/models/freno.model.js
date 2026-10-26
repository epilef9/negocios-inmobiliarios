const mongoose = require('mongoose');

// Conteo de intentos de los frenos (middlewares/seguridad.js). Va en MongoDB y no en la memoria del servidor
// para que todas las instancias de Vercel sumen en el mismo lugar. El índice TTL borra cada registro solo cuando vence su ventana.
const frenoSchema = new mongoose.Schema(
    {
        _id: { type: String },
        cuenta: { type: Number, default: 0 },
        vence: { type: Date, required: true },
    },
    { versionKey: false }
);

frenoSchema.index({ vence: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Freno', frenoSchema, 'frenos');
