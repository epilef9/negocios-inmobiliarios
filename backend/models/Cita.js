const mongoose = require("mongoose");

const CitaSchema = new mongoose.Schema(
  {
    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", required: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    fecha: { type: Date, required: true },
    horario: { type: String, required: true },
    nota_adicional: { type: String },
    estado: {
      type: String,
      enum: ["pendiente", "confirmada", "rechazada"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cita", CitaSchema);
