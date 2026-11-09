const mongoose = require('mongoose');

const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'rechazada', 'vencida', 'cancelada'];

// Cada cambio de estado queda anotado: quién lo hizo y cuándo
const cambioSchema = new mongoose.Schema(
    {
        estado: { type: String, enum: ESTADOS_RESERVA, required: true },
        fecha: { type: Date, required: true },
        // cliente, admin o sistema (el barrido de vencidas)
        por: { type: String, enum: ['cliente', 'admin', 'sistema'], required: true },
        nota: { type: String, trim: true, maxlength: 300, default: '' },
    },
    { _id: false }
);

// Reserva de una estadía en alquiler temporario (HU-20). Mismo criterio de fechas que Disponibilidad:
// texto "AAAA-MM-DD", `entrada` es la primera noche y `salida` el día en que se va (no se cuenta).
const reservaSchema = new mongoose.Schema(
    {
        propiedad: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        // Copia del título: si la propiedad se borra, la reserva se sigue entendiendo
        tituloPropiedad: { type: String, trim: true, default: '' },
        cliente: {
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            nombre: { type: String, trim: true, default: '' },
            email: { type: String, trim: true, lowercase: true, default: '' },
            telefono: { type: String, trim: true, default: '' },
        },
        entrada: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        salida: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        noches: { type: Number, required: true, min: 1 },
        huespedes: { type: Number, required: true, min: 1 },
        // Precios copiados al reservar: si después se edita la propiedad, el total de esta reserva no cambia
        precioPorNocheUSD: { type: Number, required: true, min: 0 },
        limpiezaUSD: { type: Number, default: 0, min: 0 },
        totalUSD: { type: Number, required: true, min: 0 },
        estado: { type: String, enum: ESTADOS_RESERVA, default: 'pendiente' },
        // Hasta cuándo el administrador puede confirmarla sin que se liberen las noches
        venceEn: { type: Date, required: true },
        motivoRechazo: { type: String, trim: true, maxlength: 300, default: '' },
        historial: { type: [cambioSchema], default: [] },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                ret.id = ret._id.toString();
                return ret;
            },
        },
    }
);

// Panel (por estado, las más nuevas primero), Mi cuenta (por cliente) y barrido de vencidas
reservaSchema.index({ estado: 1, createdAt: -1 });
reservaSchema.index({ 'cliente.usuario': 1, createdAt: -1 });
reservaSchema.index({ estado: 1, venceEn: 1 });

const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;
module.exports.ESTADOS_RESERVA = ESTADOS_RESERVA;
