const mongoose = require('mongoose');

const documentoSchema = new mongoose.Schema(
    {
        tipo: { type: String, required: true },
        archivoId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tamano: { type: Number, required: true },
        tipoMime: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
    },
    { _id: false }
);

const ESTADOS_SOLICITUD = ['pendiente', 'falta_documentacion', 'aprobada', 'rechazada', 'vencida', 'cerrada'];

const cambioEstadoSchema = new mongoose.Schema(
    {
        estado: { type: String, enum: ESTADOS_SOLICITUD, required: true },
        comentario: { type: String, trim: true, maxlength: 500, default: '' },
        comentarioReferenciaIndice: { type: Number, min: 0 },
        tipoEvento: { type: String, enum: ['estado', 'documentacion_presentada'], default: 'estado' },
        administradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        automatico: { type: Boolean, default: false },
        fecha: { type: Date, default: Date.now, required: true },
    },
    { _id: false }
);

const solicitudSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        propiedad: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
        operacion: { type: String, enum: ['alquiler', 'compra'], required: true },
        estado: { type: String, enum: ESTADOS_SOLICITUD, default: 'pendiente', index: true },
        reactivadaEn: { type: Date, default: null },
        comentarioEstado: { type: String, trim: true, maxlength: 500, default: '' },
        historialEstados: { type: [cambioEstadoSchema], default: [] },
        documentosSolicitados: {
            type: [String],
            default: [],
            validate: {
                validator: (documentos) => documentos.length <= 12 && new Set(documentos).size === documentos.length,
                message: 'La lista de documentos solicitados no es válida.',
            },
        },
        documentosSolicitadosEn: { type: Date, default: null },
        documentosSolicitadosPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        ultimaCorreccionIdempotencia: { type: String, default: null, select: false },
        archivada: { type: Boolean, default: false, index: true },
        archivadaEn: { type: Date, default: null },
        archivadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        datosCifrados: { type: String, required: true, select: false },
        documentos: { type: [documentoSchema], default: [] },
        claveIdempotencia: { type: String, required: true },
    },
    { timestamps: true }
);

solicitudSchema.index({ usuario: 1, claveIdempotencia: 1 }, { unique: true });
solicitudSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.model('Solicitud', solicitudSchema);
