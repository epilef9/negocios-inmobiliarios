// config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // opciones por defecto en versiones recientes de mongoose (>=6) no son necesarias,
      // pero las dejamos comentadas por si usás una versión vieja:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("✅ Conectado a MongoDB Atlas - negocios_inmobiliarios");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
