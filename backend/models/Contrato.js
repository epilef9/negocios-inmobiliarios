const mongoose = require("mongoose");

const ContratoSchema = new mongoose.Schema(
  {
    tipo_contrato: { type: String, enum: ["alquiler", "venta"], required: true },
    fecha_generacion: { type: Date, default: Date.now },
    contenido_documento: { type: String, required: true }, // texto final ya completado
    estado: {
      type: String,
      enum: ["borrador", "generado", "firmado"],
      default: "borrador",
    },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", required: true },
    modelo_contrato: { type: mongoose.Schema.Types.ObjectId, ref: "ModeloContrato" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contrato", ContratoSchema);
