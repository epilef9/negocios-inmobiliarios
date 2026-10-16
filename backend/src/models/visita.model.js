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
        estado: {
            type: String,
            enum: ['pendiente', 'confirmada', 'reprogramada', 'rechazada'],
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

visitaSchema.pre('save', function (next) {
    if (!this.cliente?.iniciales && this.cliente?.nombre) {
        this.cliente.iniciales = this.cliente.nombre
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase() || '')
            .join('') || 'CL';
    }
    next();
});

const Visita = mongoose.model('Visita', visitaSchema);

module.exports = Visita;
