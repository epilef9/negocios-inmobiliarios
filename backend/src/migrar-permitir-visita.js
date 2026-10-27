// Las propiedades cargadas antes de que existiera la casilla «Agendar una visita» la tienen vacía. El sitio ya
// toma vacía como sí, pero esto deja el valor guardado para que el panel muestre la casilla tildada.
// No cambia las que el administrador desactivó a propósito (permitirVisita: false).
//
// Uso:
//   npm run migrar:visitas -- --probar   → muestra cuántas cambiaría, sin tocar nada
//   npm run migrar:visitas               → las actualiza

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Property = require('./models/property.model');

const SOLO_PROBAR = process.argv.includes('--probar');
const SIN_VALOR = { $or: [{ permitirVisita: { $exists: false } }, { permitirVisita: null }] };

async function migrar() {
    await connectDB();
    const cantidad = await Property.countDocuments(SIN_VALOR);
    if (SOLO_PROBAR) {
        console.log(`Se marcarían ${cantidad} propiedades con «Agendar una visita».`);
        return;
    }
    const { modifiedCount } = await Property.updateMany(SIN_VALOR, { $set: { permitirVisita: true } });
    console.log(`Listo: ${modifiedCount} propiedades ahora permiten agendar visitas.`);
}

migrar()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
