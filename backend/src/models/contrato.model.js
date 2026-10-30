const mongoose = require('mongoose');
const { cifrar, descifrar } = require('../utils/cifrado-solicitudes');

// Los datos personales sensibles se guardan cifrados con la misma clave que las solicitudes.
// Además quedan con select:false, así solo aparecen cuando el repositorio los pide de forma explícita
// (la ruta que usa el panel) y nunca en los listados. Los contratos viejos con texto plano se siguen leyendo.
const cifrado = {
    set(valor) {
        if (typeof valor !== 'string' || !valor.trim()) return '';
        try {
            return cifrar(Buffer.from(valor.trim(), 'utf8')).toString('base64');
        } catch {
            // Sin clave configurada (por ejemplo, en pruebas o datos históricos): se guarda tal cual.
            return valor.trim();
        }
    },
    get(valor) {
        if (!valor) return '';
        try {
            return descifrar(Buffer.from(valor, 'base64')).toString('utf8');
        } catch {
            // Valores viejos en texto plano.
            return valor;
        }
    },
};

const camposProtegidos = () => ({
    dni: { type: String, trim: true, select: false, set: cifrado.set, get: cifrado.get },
    cuil: { type: String, trim: true, select: false, set: cifrado.set, get: cifrado.get },
    domicilio: { type: String, trim: true, select: false, set: cifrado.set, get: cifrado.get },
});

const datosPersona = () => ({
    nombre: { type: String, trim: true },
    apellido: { type: String, trim: true },
    ...camposProtegidos(),
    localidad: { type: String, trim: true },
    provincia: { type: String, trim: true },
    telefono: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
});

// Cliente del contrato: mantiene los campos históricos (usuario, nombre, teléfono) y suma los del formulario.
const clienteSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ...datosPersona(),
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
}, { _id: false });

// Cotitular, garante y propietario son opcionales: un contrato viejo no los tiene.
const personaSchema = new mongoose.Schema(datosPersona(), { _id: false });

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
        type: clienteSchema,
        required: true,
    },
    cotitular: {
        type: personaSchema,
    },
    garante: {
        type: personaSchema,
    },
    tipoGarantia: {
        type: String,
        enum: ['propietaria', 'caucion'],
    },
    // Locador (alquiler) o vendedor (compraventa)
    propietario: {
        type: personaSchema,
    },
    propiedad: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
        titulo: { type: String, required: true, trim: true },
        direccion: { type: String, required: true, trim: true },
    },
    // De dónde salieron los datos precargados
    solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud' },
    publicacion: { type: mongoose.Schema.Types.ObjectId, ref: 'SolicitudPublicacion' },
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
        select: false,
        set: cifrado.set,
        get: cifrado.get,
    },
    ultimaActualizacion: {
        type: String,
    },
    // Cobro mensual: día del mes hasta el que se paga sin estar atrasado
    diaVencimiento: {
        type: Number,
        min: 1,
        max: 28,
        default: 10,
    },
    // Montos nuevos por índice: desde qué mes («2026-11») rige cada uno
    actualizaciones: [{
        _id: false,
        desde: { type: String, required: true },
        monto: { type: Number, required: true, min: 0 },
        porcentaje: { type: Number },
        indice: { type: String, trim: true, maxlength: 40 },
        cargadaEl: { type: Date, default: Date.now },
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

contratoSchema.pre('save', function () {
    // Mongoose 9 ya no pasa next: el gancho termina solo
    this.updatedAt = Date.now();
});

// Al serializar (respuestas del panel) se aplican los getters para devolver los datos descifrados.
// Los listados no traen los campos con select:false, así que no se exponen.
contratoSchema.set('toJSON', { getters: true });
contratoSchema.set('toObject', { getters: true });

const Contrato = mongoose.model('Contrato', contratoSchema);

module.exports = Contrato;
