const mongoose = require('mongoose');

const contratoSchema = new mongoose.Schema({
    numeroContrato: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    codigoId: {
        type: String,
        trim: true,
    },
    cliente: {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nombre: { type: String, required: true, trim: true },
        dni: { type: String, trim: true },
        telefono: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
    },
    propiedad: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
        titulo: { type: String, required: true, trim: true },
        direccion: { type: String, required: true, trim: true },
    },
    fechaInicio: {
        type: String,
        required: true,
    },
    fechaFin: {
        type: String,
        required: true,
    },
    montoMensual: {
        type: String,
        required: true,
    },
    estado: {
        type: String,
        enum: ['activo', 'firmado', 'finalizado', 'cancelado', 'por_vencer', 'vencido', 'borrador'],
        default: 'borrador',
    },
    tipoContrato: {
        type: String,
        enum: ['Alquiler permanente', 'Alquiler temporario', 'Comercial', 'Compraventa'],
    },
    plantilla: {
        type: String,
    },
    duracionMeses: {
        type: Number,
        min: 0,
    },
    depositoGarantia: {
        type: String,
    },
    ajuste: {
        type: String,
        enum: ['Semestral', 'Cuatrimestral', 'Trimestral', 'Anual'],
    },
    comision: {
        type: String,
    },
    incluyeGarante: {
        type: Boolean,
        default: false,
    },
    permitirEdicionManual: {
        type: Boolean,
        default: true,
    },
    observaciones: {
        type: String,
    },
    locadora: {
        type: String,
    },
    locadoraUsuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    locadoraDni: {
        type: String,
        trim: true,
    },
    ultimaActualizacion: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

contratoSchema.pre('save', function () {
    // Mongoose 9 ya no pasa next: el gancho termina solo
    this.updatedAt = Date.now();
});

const Contrato = mongoose.model('Contrato', contratoSchema);

module.exports = Contrato;
