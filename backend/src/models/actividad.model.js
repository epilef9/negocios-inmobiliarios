const mongoose = require('mongoose');

// Registro de actividad del panel: quién hizo qué, sobre qué y cuándo. Se guarda sin vencimiento y no se edita.
const actividadSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        // Nombre y rol al momento de actuar: el registro se sigue leyendo bien aunque la cuenta cambie o se dé de baja
        usuarioNombre: { type: String, trim: true, default: '' },
        usuarioRol: { type: String, default: '' },
        accion: { type: String, required: true, trim: true, maxlength: 80 },
        entidad: { type: String, enum: ['visita', 'reserva', 'sena', 'solicitud', 'propiedad', 'publicacion', 'empleado'], required: true },
        entidadId: { type: String, default: null },
        detalle: { type: String, trim: true, maxlength: 300, default: '' },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

actividadSchema.index({ entidad: 1, entidadId: 1, createdAt: -1 });
actividadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Actividad', actividadSchema);
