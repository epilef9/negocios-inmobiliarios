// Copia de seguridad de la base de datos (el plan gratis de MongoDB Atlas no hace copias automáticas).
//
// Exporta TODAS las colecciones, incluidas las de GridFS (documentosSolicitudes.files / .chunks y
// las demás *.files / *.chunks), a una carpeta con un archivo .ndjson.gz por colección y un
// manifest.json con la cantidad de documentos y los índices.
//
// Uso (desde backend/):
//   node scripts/respaldo.js                      -> guarda en backend/respaldos/AAAA-MM-DD_HHMM/
//   node scripts/respaldo.js --salida D:\copias   -> guarda en otra carpeta
//
// Lee la base de MONGODB_URI (solo lectura: no modifica ni borra nada).
// Los documentos de las solicitudes ya están cifrados con SOLICITUDES_ENCRYPTION_KEY: esa clave
// NO va en la copia y hay que guardarla aparte, o los documentos no se podrán leer al restaurar.
// La copia contiene datos personales: guardala en un lugar privado, fuera de Atlas y fuera de Git.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { once } = require('events');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const nombreDeBase = (uri) => {
    try {
        return decodeURIComponent(new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, ''));
    } catch {
        return '';
    }
};

const argumento = (nombre) => {
    const i = process.argv.indexOf(nombre);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

const sello = () => {
    const d = new Date();
    const dos = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}`;
};

// Escribe un documento por línea (EJSON conserva ObjectId, fechas y binarios de GridFS)
const exportarColeccion = async (coleccion, archivo) => {
    const gzip = zlib.createGzip();
    const salida = fs.createWriteStream(archivo);
    gzip.pipe(salida);
    let cantidad = 0;
    for await (const doc of coleccion.find({})) {
        const ok = gzip.write(EJSON.stringify(doc, { relaxed: false }) + '\n');
        cantidad += 1;
        if (!ok) await once(gzip, 'drain');
    }
    gzip.end();
    await once(salida, 'finish');
    return cantidad;
};

const main = async () => {
    const uri = process.env.MONGODB_URI || process.env.DB_URI;
    if (!uri) throw new Error('Falta MONGODB_URI (en backend/.env o en el entorno).');

    const raiz = argumento('--salida') || path.join(__dirname, '..', 'respaldos');
    const carpeta = path.join(raiz, sello());
    fs.mkdirSync(carpeta, { recursive: true });

    const cliente = new MongoClient(uri, { family: 4, serverSelectionTimeoutMS: 15000 });
    await cliente.connect();
    try {
        const db = cliente.db(nombreDeBase(uri) || undefined);
        const colecciones = (await db.listCollections({}, { nameOnly: true }).toArray())
            .map((c) => c.name)
            .filter((n) => !n.startsWith('system.'))
            .sort();

        const manifiesto = { creado: new Date().toISOString(), base: db.databaseName, colecciones: {} };
        for (const nombre of colecciones) {
            const coleccion = db.collection(nombre);
            const indices = (await coleccion.indexes().catch(() => [])).filter((i) => i.name !== '_id_');
            const cantidad = await exportarColeccion(coleccion, path.join(carpeta, `${nombre}.ndjson.gz`));
            manifiesto.colecciones[nombre] = { documentos: cantidad, indices };
            console.log(`  ${nombre}: ${cantidad} documentos`);
        }
        fs.writeFileSync(path.join(carpeta, 'manifest.json'), JSON.stringify(manifiesto, null, 2));
        console.log(`\nCopia lista en ${carpeta}`);
        console.log('Guardala fuera de Atlas, en un lugar privado, y guardá SOLICITUDES_ENCRYPTION_KEY aparte.');
    } finally {
        await cliente.close();
    }
};

main().catch((error) => {
    console.error(`No se pudo hacer la copia: ${error.message}`);
    process.exit(1);
});
