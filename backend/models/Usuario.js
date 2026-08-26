const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema(
  {
    nombre_completo: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    contrasena: { type: String, required: true }, // se guarda hasheada (bcrypt), nunca en texto plano
    telefono: { type: String },
    estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
    fecha_registro: { type: Date, default: Date.now },
    rol: { type: mongoose.Schema.Types.ObjectId, ref: "Rol", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Usuario", UsuarioSchema);
