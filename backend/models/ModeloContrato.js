const mongoose = require("mongoose");

const ModeloContratoSchema = new mongoose.Schema({
  tipo_contrato: { type: String, enum: ["alquiler", "venta"], required: true },
  contenido_base: { type: String, required: true }, // plantilla con placeholders {{cliente}}, {{propiedad}}, etc.
});

module.exports = mongoose.model("ModeloContrato", ModeloContratoSchema);
