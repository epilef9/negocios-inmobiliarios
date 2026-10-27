const mongoose = require('mongoose');

// HU-13: reserva de una propiedad en venta o alquiler con seña. Mientras está activa la propiedad figura
// «Reservada» en el catálogo; si llega la fecha límite sin concretarse, vence y vuelve a «Disponible».
const reservaPropiedadSchema = new mongoose.Schema(
    {
        propiedad: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
        // Copia del título, para que el historial se entienda aunque la propiedad cambie o se borre
        tituloPropiedad: { type: String, trim: true, default: '' },
        operacion: { type: String, enum: ['venta', 'alquiler'], required: true },
        cliente: {
            nombre: { type: String, trim: true, required: true, maxlength: 120 },
            email: { type: String, trim: true, lowercase: true, default: '', maxlength: 150 },
            telefono: { type: String, trim: true, default: '', maxlength: 40 },
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        },
        sena: {
            monto: { type: Number, min: 0, required: true },
            moneda: { type: String, enum: ['USD', 'ARS'], default: 'USD' },
            recibidaEl: { type: Date, default: Date.now },
        },
        fechaLimite: { type: Date, required: true },
        estado: { type: String, enum: ['activa', 'concretada', 'cancelada', 'vencida'], default: 'activa', index: true },
        notas: { type: String, trim: true, default: '', maxlength: 1000 },
        // Qué pasó con la seña al cerrarse (se devuelve, queda como parte de pago, se retiene)
        cierre: { type: String, trim: true, default: '', maxlength: 500 },
        cerradaEl: { type: Date, default: null },
    },
    { timestamps: true }
);

reservaPropiedadSchema.index({ estado: 1, fechaLimite: 1 });

module.exports = mongoose.models.ReservaPropiedad || mongoose.model('ReservaPropiedad', reservaPropiedadSchema);
