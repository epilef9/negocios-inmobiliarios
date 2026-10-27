const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema(
    {
        cliente: {
            nombre: {
                type: String,
                required: true,
                trim: true,
            },
            telefono: {
                type: String,
                required: true,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                default: '',
            },
            iniciales: {
                type: String,
                trim: true,
                default: '',
            },
        },
        propiedad: {
            id: {
                type: String,
                trim: true,
                default: '',
            },
            titulo: {
                type: String,
                required: true,
                trim: true,
            },
            direccion: {
                type: String,
                trim: true,
                default: '',
            },
            precio: {
                type: String,
                trim: true,
                default: '',
            },
        },
        fecha: {
            type: String,
            required: true,
            trim: true,
        },
        horario: {
            type: String,
            required: true,
            trim: true,
        },
        // Lo que duraba un turno cuando se pidió (HU-19). Las visitas anteriores no lo tienen: cuentan como 30 min
        duracionMinutos: {
            type: Number,
            min: 5,
            max: 240,
        },
        canceladaAt: { type: Date, default: null },
        // 223: cuándo se mandó el mail de recordatorio del día anterior (para no mandarlo dos veces)
        recordatorioEnviadoAt: { type: Date, default: null },
        motivoCancelacion: { type: String, trim: true, default: '', maxlength: 300 },
        // Cuenta del cliente que la pidió con la sesión iniciada (HU-34: la ve y la cancela desde Mi cuenta)
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        estado: {
            type: String,
            enum: ['pendiente', 'confirmada', 'reprogramada', 'rechazada', 'cancelada'],
            default: 'pendiente',
        },
        notaAdicional: {
            type: String,
            trim: true,
            default: '',
        },
        motivoRechazo: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                ret.id = ret._id.toString();
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_doc, ret) => {
                ret.id = ret._id.toString();
                return ret;
            },
        },
    }
);

// Mongoose 9 ya no pasa next() a los hooks pre: con retornar alcanza
visitaSchema.pre('save', function () {
    if (!this.cliente?.iniciales && this.cliente?.nombre) {
        this.cliente.iniciales = this.cliente.nombre
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase() || '')
            .join('') || 'CL';
    }
});

const Visita = mongoose.model('Visita', visitaSchema);

module.exports = Visita;
