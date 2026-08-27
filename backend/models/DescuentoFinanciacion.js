const mongoose = require("mongoose");

const DescuentoFinanciacionSchema = new mongoose.Schema({
  tipo: { type: String, enum: ["descuento", "financiacion"], required: true },
  descripcion: { type: String },
  condiciones: { type: String },
  porcentaje_descuento: { type: Number },
  propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", required: true },
});

module.exports = mongoose.model("DescuentoFinanciacion", DescuentoFinanciacionSchema);
