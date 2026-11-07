const mongoose = require('mongoose');

// Persona vinculada a la propiedad (dueño o inquilino). Si es un usuario registrado se guarda su id y,
// además, una copia de sus datos de contacto, para poder cargar también a quien no tiene cuenta.
const personaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String, trim: true },
    apellido: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
    dni: { type: String, trim: true },
}, { _id: false });

// Precio de una operación (venta o alquiler). precio va siempre en dólares (para ordenar y filtrar);
// moneda es la moneda en que se cargó y precioARS el valor en pesos.
const precioSchema = new mongoose.Schema({
    precio: { type: Number, required: true, min: 0 },
    moneda: { type: String, enum: ['USD', 'ARS'], default: 'USD' },
    precioARS: { type: Number, min: 0 },
}, { _id: false });

const propertySchema = new mongoose.Schema({
    // Datos personales: no se leen salvo que se pidan con select('+propietario +inquilino'),
    // así las consultas públicas del catálogo nunca los devuelven (RNF-05).
    propietario: { type: personaSchema, select: false },
    inquilino: { type: personaSchema, select: false },
    // Solicitud de publicación que dio origen a esta propiedad: de ahí sale el dueño para los contratos.
    publicacion: { type: mongoose.Schema.Types.ObjectId, ref: 'SolicitudPublicacion' },
    titulo: {
        type: String,
        required: true,
    },
    codigoInterno: String,
    descripcion: {
        type: String,
    },
    // Precio de la operación principal (copia de precios.venta o precios.alquiler; en temporario, el de referencia)
    precio: {
        type: Number,
        required: true,
        min: 0,
    },
    moneda: {
        type: String,
        enum: ['USD', 'ARS'],
        default: 'USD',
    },
    precioARS: { type: Number, min: 0 },
    cotizacionDolar: { type: Number, min: 0 },
    ubicacion: {
        type: String,
        required: true,
    },
    ciudad: String,
    provincia: { type: String, enum: ['entre_rios'] },
    direccionCompleta: String,
    referenciasUbicacion: String,
    // HU-25 / RF-03: operaciones en las que se publica (venta y alquiler se pueden combinar; temporario va solo)
    // y el precio de cada una. Ver utils/operaciones.js.
    operaciones: {
        type: [{ type: String, enum: ['venta', 'alquiler', 'temporario'] }],
        default: undefined,
    },
    precios: {
        venta: { type: precioSchema, default: undefined },
        alquiler: { type: precioSchema, default: undefined },
    },
    // Copia de la operación principal (venta si está, si no la única). La mantiene properties.service.
    categoriaOperacion: {
        type: String,
        enum: ['venta', 'alquiler', 'temporario'],
    },
    // Ya no se usa: las solicitudes se admiten para las operaciones de la propiedad. Queda por las cargadas antes.
    operacionesSolicitud: {
        type: [{ type: String, enum: ['venta', 'alquiler'] }],
        default: undefined,
    },
    permitirSolicitudes: { type: Boolean, default: true },
    tipoInmueble: {
        type: String,
        enum: ['departamento', 'local', 'casa', 'monoambiente', 'terreno'],
    },
    ambientes: { type: Number, min: 0 },
    comodidades: [String],
    otrasComodidades: String,
    expensas: String,
    montoExpensas: { type: Number, min: 0 },
    cochera: String,
    pisoUnidad: String,
    linkGoogleMaps: String,
    latitud: String,
    longitud: String,
    // Sin valor cuenta como sí (las cargadas antes de la casilla también admiten visitas)
    permitirVisita: { type: Boolean, default: true },
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
    // Ya se vendió, aunque después figure alquilada (el comprador la alquila): así la venta no se reabre.
    // Se marca al pasar a vendida y se borra al volver a disponible (ver properties.service).
    vendida: { type: Boolean, default: undefined },
    // HU-12: descuento por tiempo limitado y plan de financiación propio de la propiedad
    descuento: {
        porcentaje: { type: Number, min: 0, max: 90, default: 0 },
        hasta: { type: Date, default: null },
        motivo: { type: String, trim: true, default: '' },
    },
    financiacion: {
        disponible: { type: Boolean, default: false },
        anticipoPorcentaje: { type: Number, min: 0, max: 100, default: 0 },
        cuotas: { type: Number, min: 0, max: 360, default: 0 },
        tasa: { type: String, trim: true, default: '' },
        detalle: { type: String, trim: true, default: '' },
    },
    // HU-13: hasta cuándo dura la reserva con seña (se muestra en la ficha mientras está «Reservada»)
    reservadaHasta: { type: Date, default: undefined },
    orden: {
        type: Number,
        default: 0,
    },
    dormitorios: {
        type: Number,
        required: true,
        min: 0,
    },
    banos: {
        type: Number,
        required: true,
        min: 0,
    },
    area: {
        type: Number,
        required: true,
        min: 0,
    },
    superficieCubierta: {
        type: Number,
        min: 0,
    },
    fotos: [{
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