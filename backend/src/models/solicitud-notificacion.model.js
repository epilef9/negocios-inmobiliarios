const mongoose = require('mongoose');

const solicitudNotificacionSchema = new mongoose.Schema(
    {
        solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud', required: true, unique: true },
        tipo: { type: String, enum: ['nueva_solicitud'], default: 'nueva_solicitud' },
        mensaje: { type: String, required: true },
        leida: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SolicitudNotificacion', solicitudNotificacionSchema);
