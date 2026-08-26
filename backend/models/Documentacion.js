const mongoose = require("mongoose");

const DocumentacionSchema = new mongoose.Schema({
  tipo_documento: { type: String, required: true }, // DNI, recibo de sueldo, escritura, etc.
  archivo: { type: String, required: true }, // url
  fecha_carga: { type: Date, default: Date.now },
  formulario: { type: mongoose.Schema.Types.ObjectId, ref: "FormularioInquilinoComprador" },
  solicitud: { type: mongoose.Schema.Types.ObjectId, ref: "SolicitudPublicacion" },
});

module.exports = mongoose.model("Documentacion", DocumentacionSchema);
