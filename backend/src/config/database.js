const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Resuelve registros SRV de MongoDB Atlas usando DNS públicos para evitar ECONNREFUSED en redes locales
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
    console.warn('No se pudieron configurar los DNS personalizados:', e.message);
}

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.DB_URI;

        if (!mongoUri || /TU_USUARIO|TU_PASSWORD|TU_CLUSTER/.test(mongoUri)) {
            throw new Error('MONGODB_URI no está configurada. Reemplaza los valores de ejemplo en backend/.env por la URI real de MongoDB Atlas.');
        }

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;