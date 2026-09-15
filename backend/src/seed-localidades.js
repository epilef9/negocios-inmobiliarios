const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Localidad = require('./models/localidad.model');

const localidades = [
    'Villa Libertador San Martín',
    'Crespo',
    'Diamante',
];

async function seedLocalidades() {
    await connectDB();
    await Localidad.updateMany({}, { $set: { activa: false } });
    await Promise.all(localidades.map((nombre) => Localidad.updateOne(
        { nombre },
        { $set: { nombre, provincia: 'entre_rios', activa: true } },
        { upsert: true },
    )));
    console.log(`✅ ${localidades.length} localidades de Entre Ríos cargadas.`);
    await mongoose.disconnect();
}

seedLocalidades().catch((error) => {
    console.error('❌ Error al cargar localidades:', error);
    process.exit(1);
});
