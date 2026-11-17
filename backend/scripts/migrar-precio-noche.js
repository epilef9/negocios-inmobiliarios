// Completa el precio por noche de las propiedades en alquiler temporario que no lo tienen.
// Las publicaciones aprobadas antes del arreglo quedaron con `precio` pero sin `precioPorNocheUSD`,
// y sin ese dato no se pueden reservar (la ficha mostraba "2 noches × USD 0").
// `precio` ya está en dólares (si se cargó en pesos, se convirtió con la cotización al guardarse).
//
// Uso (desde backend/):
//   npm run migrar:precio-noche -- --probar   → muestra qué cambiaría, sin tocar nada
//   npm run migrar:precio-noche               → actualiza la base

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const Property = require('../src/models/property.model');

const SOLO_PROBAR = process.argv.includes('--probar');

async function migrar() {
    await connectDB();

    const propiedades = await Property.find({
        $or: [{ operaciones: 'temporario' }, { categoriaOperacion: 'temporario' }],
        precioPorNocheUSD: { $not: { $gt: 0 } },
    }).select('titulo precio moneda precioARS minimoNoches').lean();

    let cambiadas = 0;
    const sinPrecio = [];
    for (const propiedad of propiedades) {
        if (!(propiedad.precio > 0)) {
            sinPrecio.push(propiedad);
            continue;
        }
        const cambios = { precioPorNocheUSD: propiedad.precio };
        if (!propiedad.minimoNoches) cambios.minimoNoches = 1;
        const origen = propiedad.moneda === 'ARS' ? ` (cargado como ARS ${propiedad.precioARS})` : '';
        console.log(`${SOLO_PROBAR ? 'Cambiaría' : 'Actualizada'}: ${propiedad.titulo} (${propiedad._id}) → USD ${propiedad.precio} por noche${origen}${cambios.minimoNoches ? ', mínimo 1 noche' : ''}`);
        if (!SOLO_PROBAR) await Property.updateOne({ _id: propiedad._id }, { $set: cambios });
        cambiadas++;
    }

    for (const propiedad of sinPrecio) {
        console.log(`Sin precio para copiar, revisar a mano: ${propiedad.titulo} (${propiedad._id})`);
    }
    console.log(`\n${cambiadas} propiedad(es) ${SOLO_PROBAR ? 'cambiarían (modo --probar, no se tocó nada)' : 'actualizadas'}.`);
}

migrar()
    .catch((error) => {
        console.error('Error en la migración:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
