const mongoose = require("mongoose");

const FormularioInquilinoCompradorSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    dni: { type: String, required: true },
    domicilio: { type: String, required: true },
    ingresos: { type: Number },
    referencias: { type: String },
    estado: {
      type: String,
      enum: ["pendiente", "aprobado", "rechazado"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "FormularioInquilinoComprador",
  FormularioInquilinoCompradorSchema
);
