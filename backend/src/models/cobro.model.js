const mongoose = require('mongoose');

// Cobro mensual de un contrato de alquiler: uno por contrato y mes («2026-11»).
// Se crea al registrar el pago o al avisarle al inquilino que está atrasado. Guarda una copia de los datos
// que van en el recibo (inquilino, propiedad, monto) para que el recibo no cambie si después se edita el contrato.
const cobroSchema = new mongoose.Schema(
    {
        contrato: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrato', required: true },
        periodo: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
        estado: { type: String, enum: ['pendiente', 'pagado'], default: 'pendiente' },
        monto: { type: Number, min: 0 },
        moneda: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
        pagadoEl: { type: String, default: null },
        medio: { type: String, enum: ['efectivo', 'transferencia', 'otro', null], default: null },
        nota: { type: String, trim: true, default: '', maxlength: 300 },
        // Correlativo de los recibos (solo los cobros pagados tienen número)
        numeroRecibo: { type: Number },
        avisadoEl: { type: Date, default: null },
        numeroContrato: { type: String, default: '' },
        inquilino: { type: String, default: '' },
        propietario: { type: String, default: '' },
        propiedad: {
            titulo: { type: String, default: '' },
            direccion: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

cobroSchema.index({ contrato: 1, periodo: 1 }, { unique: true });
cobroSchema.index({ numeroRecibo: 1 }, { unique: true, partialFilterExpression: { numeroRecibo: { $type: 'number' } } });

module.exports = mongoose.models.Cobro || mongoose.model('Cobro', cobroSchema);
