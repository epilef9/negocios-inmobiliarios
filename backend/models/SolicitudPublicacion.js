const mongoose = require("mongoose");

const SolicitudPublicacionSchema = new mongoose.Schema(
  {
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "Propietario", required: true },
    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", default: null }, // se completa cuando se aprueba
    fecha_solicitud: { type: Date, default: Date.now },
    estado: {
      type: String,
      enum: ["pendiente", "aprobada", "rechazada"],
      default: "pendiente",
    },
    observaciones: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SolicitudPublicacion", SolicitudPublicacionSchema);
