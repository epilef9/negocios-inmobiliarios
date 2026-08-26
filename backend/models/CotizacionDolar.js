const mongoose = require("mongoose");

const CotizacionDolarSchema = new mongoose.Schema({
  valor_blue: { type: Number, required: true },
  fecha_actualizacion: { type: Date, default: Date.now },
  fuente: { type: String, default: "API externa" },
});

module.exports = mongoose.model("CotizacionDolar", CotizacionDolarSchema);
