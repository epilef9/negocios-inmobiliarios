const mongoose = require("mongoose");

// Subdocumento: multimedia embebida (fotos/videos) — RF-01
const MultimediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    tipo: { type: String, enum: ["imagen", "video"], default: "imagen" },
    descripcion: { type: String },
  },
  { _id: false }
);

// Subdocumento: dato específico por categoría (RF-03) — ej. precio_venta, precio_alquiler_mes, precio_por_noche
const DatoCategoriaSchema = new mongoose.Schema(
  {
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: "Categoria", required: true },
    precio_usd: { type: Number, required: true },
  },
  { _id: false }
);

const PropiedadSchema = new mongoose.Schema(
  {
    tipo_inmueble: {
      type: String,
      enum: ["departamento", "casa", "local", "terreno"],
      required: true,
    },
    titulo: { type: String, required: true },
    descripcion: { type: String },
    direccion: { type: String, required: true },
    ubicacion: {
      lat: { type: Number },
      lng: { type: Number },
    },
    superficie: { type: Number },
    cantidad_ambientes: { type: Number },
    cantidad_banos: { type: Number },
    comodidades: [{ type: String }], // wifi, cochera, pileta, etc.
    estado: {
      type: String,
      enum: ["disponible", "reservado", "alquilado", "vendido"],
      default: "disponible",
    },
    categorias: [DatoCategoriaSchema], // RF-03: puede estar en venta y alquiler temporario a la vez
    multimedia: [MultimediaSchema],
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "Propietario" },
    cantidad_visitas: { type: Number, default: 0 }, // RF-06 efecto colateral (estadísticas)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Propiedad", PropiedadSchema);
