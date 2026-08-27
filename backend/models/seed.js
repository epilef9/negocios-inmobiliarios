// seed.js — Ejecutar UNA sola vez para crear las colecciones en Atlas con datos base.
// Uso: node seed.js  (necesita MONGODB_URI en variables de entorno o .env)

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("./db");

const Rol = require("./Rol");
const Categoria = require("./Categoria");
const CotizacionDolar = require("./CotizacionDolar");

async function seed() {
  await connectDB();

  // Roles base
  await Rol.updateOne(
    { nombre_rol: "administrador" },
    { $setOnInsert: { nombre_rol: "administrador" } },
    { upsert: true }
  );
  await Rol.updateOne(
    { nombre_rol: "cliente" },
    { $setOnInsert: { nombre_rol: "cliente" } },
    { upsert: true }
  );

  // Categorías de propiedad
  const categorias = ["venta", "alquiler", "alquiler_temporario", "venta_pozo"];
  for (const nombre_categoria of categorias) {
    await Categoria.updateOne(
      { nombre_categoria },
      { $setOnInsert: { nombre_categoria } },
      { upsert: true }
    );
  }

  // Cotización inicial del dólar blue (se actualiza después con un cron/API externa)
  const existeCotizacion = await CotizacionDolar.findOne();
  if (!existeCotizacion) {
    await CotizacionDolar.create({ valor_blue: 1370, fuente: "Carga manual inicial" });
  }

  console.log("✅ Colecciones y datos base creados correctamente.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Error en el seed:", err);
  process.exit(1);
});
