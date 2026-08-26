const mongoose = require("mongoose");

const RolSchema = new mongoose.Schema({
  nombre_rol: {
    type: String,
    required: true,
    enum: ["administrador", "cliente"],
    unique: true,
  },
});

module.exports = mongoose.model("Rol", RolSchema);
