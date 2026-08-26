const mongoose = require("mongoose");

const NotificacionSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true }, // ej: "nueva_visita", "nueva_solicitud", "confirmacion"
    mensaje: { type: String, required: true },
    fecha_envio: { type: Date, default: Date.now },
    estado: { type: String, enum: ["enviada", "pendiente", "fallida"], default: "pendiente" },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notificacion", NotificacionSchema);
