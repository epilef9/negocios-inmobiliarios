const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
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