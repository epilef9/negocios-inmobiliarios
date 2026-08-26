const mongoose = require("mongoose");

const ContactoInmobiliariaSchema = new mongoose.Schema({
  nombre_inmobiliaria: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  direccion: { type: String },
  horarios: { type: String },
  ubicacion: {
    lat: { type: Number },
    lng: { type: Number },
  },
  id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
});

module.exports = mongoose.model("ContactoInmobiliaria", ContactoInmobiliariaSchema);
