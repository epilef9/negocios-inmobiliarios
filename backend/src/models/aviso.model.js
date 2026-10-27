const mongoose = require('mongoose');

// 113/219: «Avisame cuando esté disponible» (una propiedad) y 221: búsqueda guardada (filtros del catálogo).
// Cada aviso tiene un token para darse de baja desde el link del mail, sin ingresar.
const avisoSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        tipo: { type: String, enum: ['disponibilidad', 'busqueda'], required: true },
        propiedad: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
        filtros: {
            operacion: { type: String, default: '' },
            localidad: { type: String, default: '' },
            tipo: { type: String, default: '' },
            precioMin: { type: Number, default: null },
            precioMax: { type: Number, default: null },
            ambientes: { type: Number, default: null },
            comodidad: { type: String, default: '' },
        },
        activo: { type: Boolean, default: true, index: true },
        tokenBaja: { type: String, required: true, unique: true },
        // Disponibilidad: cuándo se avisó (un solo mail por cambio). Búsqueda: tope de mails por día.
        avisadoEn: { type: Date, default: null },
        diaEnvios: { type: String, default: '' },
        enviosDelDia: { type: Number, default: 0 },
        ultimasAvisadas: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Aviso || mongoose.model('Aviso', avisoSchema);
