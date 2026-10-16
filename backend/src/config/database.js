const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URI;

    if (!mongoUri || /TU_USUARIO|TU_PASSWORD|TU_CLUSTER/.test(mongoUri)) {
        throw new Error('MONGODB_URI no está configurada. Reemplaza los valores de ejemplo en backend/.env por la URI real de MongoDB Atlas.');
    }

    try {
        await mongoose.connect(mongoUri, {
            family: 4,
            serverSelectionTimeoutMS: 4000,
        });
        console.log('✅ MongoDB connected successfully (SRV cluster)');
        return;
    } catch (primaryErr) {
        console.warn('⚠️ Conexión SRV inicial lenta/fallida, intentando conexión directa a nodos activos...');
    }

    // Fallback: conexión directa a los shards activos del cluster
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
            console.log('✅ MongoDB connected successfully (Direct node connection)');
            return;
        } catch (e) {
            // probar el siguiente
        }
    }

    throw new Error('No se pudo establecer conexión con ninguna réplica de MongoDB Atlas');
};

module.exports = connectDB;