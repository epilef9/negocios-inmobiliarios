const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    codigoInterno: String,
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    moneda: {
        type: String,
        enum: ['USD', 'ARS'],
        default: 'USD',
    },
    priceARS: Number,
    cotizacionDolar: Number,
    location: {
        type: String,
        required: true,
    },
    ciudad: String,
    provincia: String,
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
    cantidad_ambientes: Number,
    comodidades: [String],
    otrasComodidades: String,
    expensas: String,
    montoExpensas: Number,
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
    precioPorNocheUSD: Number,
    minimoNoches: Number,
    huespedesMaximos: Number,
    costoLimpiezaUSD: Number,
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
    },
    bathrooms: {
        type: Number,
        required: true,
    },
    area: {
        type: Number,
        required: true,
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