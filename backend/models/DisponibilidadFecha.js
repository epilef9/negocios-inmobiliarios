const mongoose = require("mongoose");

const DisponibilidadFechaSchema = new mongoose.Schema({
  propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", required: true },
  fecha: { type: Date, required: true },
  estado: { type: String, enum: ["disponible", "ocupada", "bloqueada"], default: "disponible" },
  precio_por_noche: { type: Number },
});

DisponibilidadFechaSchema.index({ propiedad: 1, fecha: 1 }, { unique: true });

module.exports = mongoose.model("DisponibilidadFecha", DisponibilidadFechaSchema);
