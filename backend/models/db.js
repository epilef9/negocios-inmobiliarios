// config/db.js
const dns = require("dns");
const mongoose = require("mongoose");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignorar si falla
}

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
