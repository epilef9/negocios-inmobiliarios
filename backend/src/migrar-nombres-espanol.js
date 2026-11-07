// Pasa a español los nombres de campos que estaban en inglés (para que el DER no mezcle idiomas).
//   properties:   title → titulo, price → precio, images → fotos, precios.venta.price → precios.venta.precio, etc.
//   users:        username → nombreUsuario, password → contrasena, role → rol (y se borra el índice viejo username_1)
//   solicituds:   reactivadaAt → reactivadaEn, archivadaAt → archivadaEn, documentos[].fileId → archivoId,
//                 documentos[].mimeType → tipoMime
//   visitas:      canceladaAt, recordatorioEnviadoAt, asistencia.respondidaAt → …En
//   tokenvisitas: usadoAt → usadoEn
//   clients:      name → nombre, phone → telefono
//
// El código nuevo ya usa los nombres en español: este script tiene que correr junto con el deploy
// (si sale uno sin el otro, nadie puede iniciar sesión).
//
// Uso (desde la carpeta backend):
//   npm run migrar:nombres -- --probar   → muestra cuántos documentos cambiaría, sin tocar nada
//   npm run migrar:nombres               → renombra los campos
// Se puede correr varias veces: solo renombra si existe el campo viejo y todavía no existe el nuevo.

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');

const SOLO_PROBAR = process.argv.includes('--probar');

const CAMPOS_DE_PRECIO = [['price', 'precio'], ['priceARS', 'precioARS']];
const RENOMBRES = [
    ['properties', [
        ['title', 'titulo'], ['description', 'descripcion'], ...CAMPOS_DE_PRECIO, ['location', 'ubicacion'],
        ['bedrooms', 'dormitorios'], ['bathrooms', 'banos'], ['images', 'fotos'],
        ['categoria_operacion', 'categoriaOperacion'], ['tipo_inmueble', 'tipoInmueble'], ['cantidad_ambientes', 'ambientes'],
        ...['venta', 'alquiler'].flatMap((operacion) => CAMPOS_DE_PRECIO.map(([viejo, nuevo]) => [`precios.${operacion}.${viejo}`, `precios.${operacion}.${nuevo}`])),
    ]],
    ['users', [['username', 'nombreUsuario'], ['password', 'contrasena'], ['role', 'rol']]],
    ['solicituds', [['reactivadaAt', 'reactivadaEn'], ['archivadaAt', 'archivadaEn']]],
    ['visitas', [['canceladaAt', 'canceladaEn'], ['recordatorioEnviadoAt', 'recordatorioEnviadoEn'], ['asistencia.respondidaAt', 'asistencia.respondidaEn']]],
    ['tokenvisitas', [['usadoAt', 'usadoEn']]],
    ['clients', [['name', 'nombre'], ['phone', 'telefono']]],
];

// documentos es una lista: $rename no entra en las listas, así que se reescribe cada elemento con $map
const DOCUMENTOS = [['fileId', 'archivoId'], ['mimeType', 'tipoMime']];
const conDocumentosViejos = { $or: DOCUMENTOS.map(([viejo]) => ({ [`documentos.${viejo}`]: { $exists: true } })) };
const renombrarDocumentos = [{
    $set: {
        documentos: {
            $map: {
                input: '$documentos',
                as: 'd',
                in: {
                    $mergeObjects: [
                        // El elemento sin los campos viejos…
                        { $arrayToObject: { $filter: { input: { $objectToArray: '$$d' }, as: 'c', cond: { $not: { $in: ['$$c.k', DOCUMENTOS.map(([viejo]) => viejo)] } } } } },
                        // …más cada campo nuevo, solo si el elemento tenía el viejo (si no, queda como estaba)
                        ...DOCUMENTOS.map(([viejo, nuevo]) => ({ $cond: [{ $eq: [{ $type: `$$d.${viejo}` }, 'missing'] }, {}, { [nuevo]: `$$d.${viejo}` }] })),
                    ],
                },
            },
        },
    },
}];

const pendiente = ([viejo, nuevo]) => ({ [viejo]: { $exists: true }, [nuevo]: { $exists: false } });

// Índices de la colección (una colección que todavía no existe no tiene ninguno)
const indicesDe = (coleccion) => coleccion.indexes().catch((error) => {
    if (error.codeName === 'NamespaceNotFound') return [];
    throw error;
});

// Se usan las colecciones directo (sin los modelos) para que Mongoose no cree índices ni colecciones al conectar
async function migrarColeccion(nombre, renombres) {
    const coleccion = mongoose.connection.db.collection(nombre);

    // Documentos que tienen el campo viejo y el nuevo a la vez: no se tocan (habría que revisarlos a mano)
    const dobles = await coleccion.countDocuments({ $or: renombres.map(([viejo, nuevo]) => ({ [viejo]: { $exists: true }, [nuevo]: { $exists: true } })) });
    if (dobles) console.log(`  ⚠️ ${nombre}: ${dobles} documentos tienen un campo viejo y el nuevo a la vez; esos campos no se tocan.`);

    if (nombre === 'users') {
        // El índice viejo se borra ANTES de renombrar: si es único, al sacar username de varios usuarios
        // chocarían como valores vacíos repetidos y el renombre fallaría.
        const indices = await indicesDe(coleccion);
        if (indices.some((indice) => indice.name === 'username_1')) {
            if (!SOLO_PROBAR) await coleccion.dropIndex('username_1');
            console.log(`  ${nombre}: índice username_1 ${SOLO_PROBAR ? 'se borraría' : 'borrado'}.`);
        }
    }

    const filtro = { $or: renombres.map(pendiente) };
    const total = await coleccion.countDocuments(nombre === 'solicituds' ? { $or: [...filtro.$or, conDocumentosViejos] } : filtro);

    if (!SOLO_PROBAR) {
        for (const par of renombres) {
            await coleccion.updateMany(pendiente(par), { $rename: { [par[0]]: par[1] } });
        }
        if (nombre === 'solicituds') await coleccion.updateMany(conDocumentosViejos, renombrarDocumentos);
    }
    console.log(`  ${nombre}: ${total} documentos ${SOLO_PROBAR ? 'cambiarían' : 'actualizados'}.`);

    // Aviso (no se toca): otros índices que todavía usan nombres viejos
    const viejos = new Set(renombres.map(([viejo]) => viejo));
    for (const indice of await indicesDe(coleccion)) {
        if (indice.name !== 'username_1' && Object.keys(indice.key).some((campo) => viejos.has(campo))) {
            console.log(`  ⚠️ ${nombre}: el índice ${indice.name} usa un nombre viejo; revisalo a mano.`);
        }
    }
    return total;
}

async function migrar() {
    await connectDB();
    console.log(`Base: ${mongoose.connection.db.databaseName}${SOLO_PROBAR ? ' (prueba, no se escribe nada)' : ''}\n`);
    let total = 0;
    for (const [nombre, renombres] of RENOMBRES) total += await migrarColeccion(nombre, renombres);
    console.log(`\n${SOLO_PROBAR ? 'Prueba:' : '✅'} ${total} documentos ${SOLO_PROBAR ? 'cambiarían' : 'actualizados'} en total.`);
}

if (require.main === module) {
    migrar()
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}
