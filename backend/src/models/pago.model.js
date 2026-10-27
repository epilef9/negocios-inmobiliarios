const mongoose = require('mongoose');

// HU-41 / 217 / 218: pagos de reservas de alquiler temporario, con Mercado Pago o por transferencia.
// El monto lo calcula SIEMPRE el servidor desde la reserva (totalUSD × dólar del día); nunca se toma del navegador.
const pagoSchema = new mongoose.Schema(
    {
        reserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva', required: true, index: true },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        metodo: { type: String, enum: ['mercadopago', 'transferencia'], required: true },
        estado: { type: String, enum: ['pendiente', 'en_revision', 'aprobado', 'rechazado', 'cancelado'], default: 'pendiente', index: true },
        montoARS: { type: Number, required: true, min: 0 },
        montoUSD: { type: Number, required: true, min: 0 },
        cotizacion: { type: Number, required: true, min: 0 },
        // Mercado Pago
        mpPreferencia: { type: String, default: '' },
        mpPago: { type: String, default: '' },
        mpEstado: { type: String, default: '' },
        // Transferencia: el comprobante se guarda en la base (máx. 4 MB) y solo lo ve el administrador
        comprobante: {
            datos: { type: Buffer, select: false },
            tipo: { type: String, default: '' },
            nombre: { type: String, default: '' },
            tamano: { type: Number, default: 0 },
        },
        nota: { type: String, trim: true, default: '', maxlength: 300 },
        aprobadoEn: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Pago || mongoose.model('Pago', pagoSchema);
