// Migración única: los requisitos cargados guardan la operación en "guia",
// pero el modelo y la página pública usan "operacion". Renombra el campo.
//
// Uso (desde backend/):
//   node scripts/migrar-requisitos.js            -> solo muestra qué cambiaría (no modifica nada)
//   node scripts/migrar-requisitos.js --aplicar  -> hace el cambio
//
// Hacé antes un respaldo: node scripts/respaldo.js

const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const aplicar = process.argv.includes('--aplicar');

(async () => {
    const uri = process.env.MONGODB_URI || process.env.DB_URI;
    if (!uri) throw new Error('Falta MONGODB_URI en backend/.env');

    const cliente = new MongoClient(uri);
    await cliente.connect();
    try {
        const db = cliente.db();
        const col = db.collection('requisitos');
        console.log(`Base: ${db.databaseName}`);

        const conGuia = await col.countDocuments({ guia: { $exists: true } });
        const conOperacion = await col.countDocuments({ operacion: { $exists: true } });
        const choque = await col.countDocuments({ guia: { $exists: true }, operacion: { $exists: true } });
        console.log(`Con "guia": ${conGuia} | con "operacion": ${conOperacion} | con los dos: ${choque}`);

        if (choque > 0) {
            console.log('Hay documentos con los dos campos: revisalos a mano antes de migrar. No se cambió nada.');
            return;
        }
        if (!aplicar) {
            console.log('Prueba: no se modificó nada. Para aplicar el cambio agregá --aplicar');
            return;
        }

        const r = await col.updateMany({ guia: { $exists: true } }, { $rename: { guia: 'operacion' } });
        console.log(`Listo: ${r.modifiedCount} requisitos actualizados.`);
    } finally {
        await cliente.close();
    }
})().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
