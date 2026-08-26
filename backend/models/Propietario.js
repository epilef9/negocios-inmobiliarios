const mongoose = require("mongoose");

const PropietarioSchema = new mongoose.Schema({
  nombre_completo: { type: String, required: true },
  telefono: { type: String },
  email: { type: String },
});

module.exports = mongoose.model("Propietario", PropietarioSchema);
