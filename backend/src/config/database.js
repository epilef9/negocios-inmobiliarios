const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Nodos del cluster de Atlas. Se usan si la conexión SRV (mongodb+srv) no responde a tiempo,
// por ejemplo cuando la red tarda en resolver el DNS. Se pueden cambiar con MONGODB_HOSTS en el .env.
const HOSTS_RESPALDO = [
    'ac-cecx9rx-shard-00-00.92retae.mongodb.net:27017',
    'ac-cecx9rx-shard-00-01.92retae.mongodb.net:27017',
    'ac-cecx9rx-shard-00-02.92retae.mongodb.net:27017'
];

const OPCIONES = {
    family: 4,
    serverSelectionTimeoutMS: 10000,
};

// Arma una URI con la lista de nodos usando el usuario, la contraseña y la base de MONGODB_URI.
// Va sin directConnection: el driver descubre el réplica set y escribe siempre en el nodo primario.
// (Conectarse directo a un solo nodo provocaba el error "not primary" al guardar.)
const uriDeRespaldo = (mongoUri) => {
    const url = new URL(mongoUri);
    const credenciales = url.username ? `${url.username}:${url.password}@` : '';
    const base = url.pathname.replace(/^\//, '') || 'inmobiliaria_db';
    const hosts = process.env.MONGODB_HOSTS || HOSTS_RESPALDO.join(',');
    return `mongodb://${credenciales}${hosts}/${base}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
};

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (mongoose.connection.readyState === 2) {
        await mongoose.connection.asPromise();
        return;
    }

    const mongoUri = process.env.MONGODB_URI || process.env.DB_URI;

    if (!mongoUri || /TU_USUARIO|TU_PASSWORD|TU_CLUSTER/.test(mongoUri)) {
        throw new Error('MONGODB_URI no está configurada. Reemplaza los valores de ejemplo en backend/.env por la URI real de MongoDB Atlas.');
    }

    try {
        await mongoose.connect(mongoUri, OPCIONES);
        console.log('✅ MongoDB connected successfully (SRV cluster)');
        return;
    } catch (errorSrv) {
        console.warn(`⚠️ La conexión SRV no respondió (${errorSrv.message}). Probando con la lista de nodos del cluster...`);
        await mongoose.disconnect().catch(() => {});
    }

    try {
        await mongoose.connect(uriDeRespaldo(mongoUri), OPCIONES);
        console.log('✅ MongoDB connected successfully (lista de nodos del cluster)');
    } catch (errorNodos) {
        throw new Error(`No se pudo establecer conexión con MongoDB Atlas: ${errorNodos.message}`);
    }
};

connectDB.uriDeRespaldo = uriDeRespaldo;

module.exports = connectDB;
