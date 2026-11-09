// Restaura una copia hecha con scripts/respaldo.js, SOLO en una base de prueba.
//
// Igual que los tests, toma la dirección de MONGODB_URI_TEST (nunca de MONGODB_URI) y se cancela si
// no está definida, si es la base real o si el nombre de la base no incluye "test"
// (mismo control que tests/base-de-prueba.js).
//
// Uso (desde backend/):
//   node scripts/restaurar.js respaldos/2026-11-09_1030
//   node scripts/restaurar.js respaldos/2026-11-09_1030 --reemplazar   (vacía antes las colecciones que ya existan en la base de prueba)
//
// Sin --reemplazar, si una colección de la copia ya tiene datos en la base de prueba, la salta.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { uriDePrueba } = require('../tests/base-de-prueba');

const nombreDeBase = (uri) => {
    try {
        return decodeURIComponent(new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, ''));
    } catch {
        return '';
    }
};

const LOTE = 500;

const restaurarColeccion = async (coleccion, archivo) => {
    const lineas = readline.createInterface({ input: fs.createReadStream(archivo).pipe(zlib.createGunzip()), crlfDelay: Infinity });
    let lote = [];
    let total = 0;
    for await (const linea of lineas) {
        if (!linea.trim()) continue;
        lote.push(EJSON.parse(linea, { relaxed: false }));
        if (lote.length >= LOTE) {
            await coleccion.insertMany(lote, { ordered: false });
            total += lote.length;
            lote = [];
        }
    }
    if (lote.length) {
        await coleccion.insertMany(lote, { ordered: false });
        total += lote.length;
    }
    return total;
};

const main = async () => {
    const carpeta = process.argv[2];
    if (!carpeta || carpeta.startsWith('--')) throw new Error('Indicá la carpeta de la copia: node scripts/restaurar.js respaldos/AAAA-MM-DD_HHMM');
    const reemplazar = process.argv.includes('--reemplazar');

    const uri = uriDePrueba(); // se cancela acá si no es una base de prueba
    const manifiesto = JSON.parse(fs.readFileSync(path.join(carpeta, 'manifest.json'), 'utf8'));

    const cliente = new MongoClient(uri, { family: 4, serverSelectionTimeoutMS: 15000 });
    await cliente.connect();
    try {
        const db = cliente.db(nombreDeBase(uri));
        if (!/test/i.test(db.databaseName)) throw new Error(`La base "${db.databaseName}" no incluye "test": no se restaura.`);
        console.log(`Restaurando en la base de prueba "${db.databaseName}"...`);

        for (const [nombre, info] of Object.entries(manifiesto.colecciones)) {
            const coleccion = db.collection(nombre);
            const existentes = await coleccion.estimatedDocumentCount();
            if (existentes > 0 && !reemplazar) {
                console.log(`  ${nombre}: ya tiene ${existentes} documentos, se salta (usá --reemplazar para vaciarla antes)`);
                continue;
            }
            if (existentes > 0) await coleccion.drop();
            const cantidad = await restaurarColeccion(coleccion, path.join(carpeta, `${nombre}.ndjson.gz`));
            for (const indice of info.indices || []) {
                const { key, name, v, ns, ...opciones } = indice;
                await coleccion.createIndex(key, { name, ...opciones }).catch((e) => console.warn(`  (índice ${name} de ${nombre}: ${e.message})`));
            }
            console.log(`  ${nombre}: ${cantidad}/${info.documentos} documentos`);
        }
        console.log('\nRestauración lista.');
    } finally {
        await cliente.close();
    }
};

main().catch((error) => {
    console.error(`No se pudo restaurar: ${error.message}`);
    process.exit(1);
});
