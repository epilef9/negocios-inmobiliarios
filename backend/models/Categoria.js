const mongoose = require("mongoose");

const CategoriaSchema = new mongoose.Schema({
  nombre_categoria: {
    type: String,
    required: true,
    enum: ["venta", "alquiler", "alquiler_temporario", "venta_pozo"],
    unique: true,
  },
  descripcion: { type: String },
});

module.exports = mongoose.model("Categoria", CategoriaSchema);
