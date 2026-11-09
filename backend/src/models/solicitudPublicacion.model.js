const mongoose = require('mongoose');

const contactoSchema = new mongoose.Schema({
    nombre: { type: String, trim: true },
    apellido: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
    dni: { type: String, trim: true },
}, { _id: false });

const precioSchema = new mongoose.Schema({
    monto: { type: Number, required: true, min: 0 },
    moneda: { type: String, enum: ['ARS', 'USD'], default: 'USD' },
}, { _id: false });

const solicitudPublicacionSchema = new mongoose.Schema({
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    contacto: {
        type: contactoSchema,
        required: true,
    },
    tipoPropiedad: {
        type: String,
        enum: ['casa', 'departamento', 'terreno', 'local', 'monoambiente', 'oficina', 'cochera', 'otro'],
        default: 'casa',
        required: true,
    },
    operacion: {
        type: String,
        enum: ['venta', 'alquiler', 'temporario'],
        default: 'venta',
        required: true,
    },
    titulo: {
        type: String,
        trim: true,
    },
    direccion: {
        type: String,
        required: true,
        trim: true,
    },
    ciudad: {
        type: String,
        trim: true,
        default: 'Libertador San Martín',
    },
    provincia: { type: String, trim: true, default: 'Entre Ríos' },
    referenciasUbicacion: { type: String, trim: true, default: '' },
    ambientes: {
        type: Number,
        default: 1,
        min: 0,
    },
    dormitorios: {
        type: Number,
        default: 0,
        min: 0,
    },
    banos: {
        type: Number,
        default: 1,
        min: 0,
    },
    superficieTotal: {
        type: Number,
        min: 0,
    },
    superficieCubierta: {
        type: Number,
        min: 0,
    },
    expensas: { type: String, trim: true, default: '' },
    montoExpensas: { type: Number, min: 0, default: 0 },
    cochera: { type: String, trim: true, default: 'no' },
    pisoUnidad: { type: String, trim: true, default: '' },
    comodidades: { type: [String], default: [] },
    otrasComodidades: { type: String, trim: true, default: '' },
    precioPretendido: {
        type: precioSchema,
        required: true,
    },
    descripcion: {
        type: String,
        trim: true,
    },
    fotos: {
        type: [String],
        default: [],
    },
    // Referencias "privado:<id>" a los documentos cifrados (ver services/documentosPublicacion.service.js).
    // No se devuelven en las consultas salvo que se pidan con .select('+documentos').
    // Se validan al crear solicitudes nuevas en el servicio; no son required acá para poder
    // actualizar o rechazar solicitudes históricas.
    documentos: {
        type: new mongoose.Schema({
            dni: { type: String, trim: true },
            escritura: { type: String, trim: true },
            impuestos: { type: String, trim: true },
            planos: { type: String, trim: true },
            reglamento: { type: String, trim: true },
        }, { _id: false }),
        select: false,
    },
    estado: {
        type: String,
        enum: ['pendiente', 'aprobada', 'rechazada'],
        default: 'pendiente',
    },
    motivoRechazo: {
        type: String,
        trim: true,
    },
    propiedadCreada: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
    },
}, {
    timestamps: true,
});

const SolicitudPublicacion = mongoose.model('SolicitudPublicacion', solicitudPublicacionSchema);

module.exports = SolicitudPublicacion;
