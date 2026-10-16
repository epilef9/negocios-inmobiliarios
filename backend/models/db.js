const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || /TU_USUARIO|TU_PASSWORD|TU_CLUSTER/.test(mongoUri)) {
    throw new Error('MONGODB_URI no está configurada.');
  }

  try {
    await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 4000,
    });
    console.log("✅ Conectado a MongoDB Atlas (SRV) - negocios_inmobiliarios");
    return;
  } catch (err) {
    console.warn("⚠️ Conexión SRV lenta/fallida, probando conexión directa...");
  }

  const directHosts = [
    'mongodb://felipecorreacamio_db_user:17BsGMggeZwtdUim@ac-cecx9rx-shard-00-01.92retae.mongodb.net:27017/inmobiliaria_db?ssl=true&authSource=admin&directConnection=true',
    'mongodb://felipecorreacamio_db_user:17BsGMggeZwtdUim@ac-cecx9rx-shard-00-00.92retae.mongodb.net:27017/inmobiliaria_db?ssl=true&authSource=admin&directConnection=true'
  ];

  for (const hostUri of directHosts) {
    try {
      await mongoose.connect(hostUri, {
        family: 4,
        serverSelectionTimeoutMS: 4000,
      });
      console.log("✅ Conectado a MongoDB Atlas (Direct Node) - negocios_inmobiliarios");
      return;
    } catch (e) {
      // probar siguiente
    }
  }

  throw new Error("No se pudo conectar a MongoDB Atlas");
}

module.exports = connectDB;
