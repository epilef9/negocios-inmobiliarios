const mongoose = require('mongoose');

// Persona vinculada a la propiedad (dueño o inquilino). Si es un usuario registrado se guarda su id y,
// además, una copia de sus datos de contacto, para poder cargar también a quien no tiene cuenta.
const personaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
}, { _id: false });

const propertySchema = new mongoose.Schema({
    // Datos personales: no se leen salvo que se pidan con select('+propietario +inquilino'),
    // así las consultas públicas del catálogo nunca los devuelven (RNF-05).
    propietario: { type: personaSchema, select: false },
    inquilino: { type: personaSchema, select: false },
    title: {
        type: String,
        required: true,
    },
    codigoInterno: String,
    description: {
        type: String,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    moneda: {
        type: String,
        enum: ['USD', 'ARS'],
        default: 'USD',
    },
    priceARS: { type: Number, min: 0 },
    cotizacionDolar: { type: Number, min: 0 },
    location: {
        type: String,
        required: true,
    },
    ciudad: String,
    provincia: { type: String, enum: ['entre_rios'] },
    direccionCompleta: String,
    referenciasUbicacion: String,
    categoria_operacion: {
        type: String,
        enum: ['venta', 'alquiler', 'temporario'],
    },
    operacionesSolicitud: {
        type: [{ type: String, enum: ['venta', 'alquiler'] }],
        default: [],
    },
    permitirSolicitudes: { type: Boolean, default: true },
    tipo_inmueble: {
        type: String,
        enum: ['departamento', 'local', 'casa', 'monoambiente', 'terreno'],
    },
    cantidad_ambientes: { type: Number, min: 0 },
    comodidades: [String],
    otrasComodidades: String,
    expensas: String,
    montoExpensas: { type: Number, min: 0 },
    cochera: String,
    pisoUnidad: String,
    linkGoogleMaps: String,
    latitud: String,
    longitud: String,
    permitirVisita: Boolean,
    permitirWhatsApp: Boolean,
    permitirEmail: Boolean,
    horarioAtencion: String,
    telefonoWhatsApp: String,
    precioPorNocheUSD: { type: Number, min: 0 },
    minimoNoches: { type: Number, min: 0 },
    huespedesMaximos: { type: Number, min: 0 },
    costoLimpiezaUSD: { type: Number, min: 0 },
    // Candado de la disponibilidad (HU-20): cada alta de rango o reserva lo incrementa dentro de su transacción.
    // Dos pedidos simultáneos escriben este mismo documento, así Mongo detecta el conflicto y el segundo se reintenta.
    versionDisponibilidad: { type: Number, default: 0, select: false },
    duracionAlquilerMeses: { type: Number, min: 0 },
    unidadDuracionAlquiler: { type: String, enum: ['meses', 'años'] },
    checkInDesde: String,
    checkOutHasta: String,
    checkInFlexible: String,
    estado: {
        type: String,
        enum: ['disponible', 'reservado', 'alquilado', 'vendido'],
        default: 'disponible',
    },
    orden: {
        type: Number,
        default: 0,
    },
    bedrooms: {
        type: Number,
        required: true,
        min: 0,
    },
    bathrooms: {
        type: Number,
        required: true,
        min: 0,
    },
    area: {
        type: Number,
        required: true,
        min: 0,
    },
    images: [{
        type: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

propertySchema.pre('save', function() {
    this.updatedAt = Date.now();
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;