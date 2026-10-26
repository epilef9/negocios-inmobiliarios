const mongoose = require('mongoose');

const documentoSchema = new mongoose.Schema(
    {
        tipo: { type: String, required: true },
        fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tamano: { type: Number, required: true },
        mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
    },
    { _id: false }
);

const solicitudSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        propiedad: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
        operacion: { type: String, enum: ['alquiler', 'compra'], required: true },
        estado: { type: String, enum: ['pendiente', 'aprobada', 'rechazada'], default: 'pendiente', index: true },
        datosCifrados: { type: String, required: true, select: false },
        documentos: { type: [documentoSchema], default: [] },
        claveIdempotencia: { type: String, required: true },
    },
    { timestamps: true }
);

solicitudSchema.index({ usuario: 1, claveIdempotencia: 1 }, { unique: true });
solicitudSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.model('Solicitud', solicitudSchema);
