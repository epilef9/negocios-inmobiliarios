// HU-25 / RF-03: pasa las propiedades cargadas antes del cambio al formato nuevo.
//   categoria_operacion: 'venta', price…  →  operaciones: ['venta'], precios.venta: { price, moneda, priceARS }
// Las de alquiler por días quedan con operaciones: ['temporario'] (su precio sigue siendo el precio por noche).
// No borra nada: categoria_operacion y price quedan como copia de la operación principal.
//
// Antes, una propiedad en venta podía aceptar también solicitudes de alquiler (operacionesSolicitud) sin tener
// precio de alquiler. Esas no se pueden pasar solas a «venta y alquiler» porque falta ese precio: el script
// las lista para que se edite cada una desde el panel y se cargue el precio que falta.
//
// Uso (desde la carpeta backend):
//   npm run migrar:operaciones -- --probar   → muestra qué cambiaría, sin tocar nada
//   npm run migrar:operaciones               → actualiza las propiedades
// Se puede correr varias veces: solo toca las que todavía no tienen operaciones.

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Property = require('./models/property.model');
const { operacionesDe, precioDe } = require('./utils/operaciones');

const SOLO_PROBAR = process.argv.includes('--probar');
const SIN_OPERACIONES = { $or: [{ operaciones: { $exists: false } }, { operaciones: { $size: 0 } }, { operaciones: null }] };

// Cambios para una propiedad vieja (también lo usan las pruebas)
const cambiosPara = (p) => {
    const operaciones = operacionesDe(p).length ? operacionesDe(p) : ['venta'];
    const cambios = { operaciones, categoria_operacion: operaciones[0] };
    if (operaciones[0] !== 'temporario') {
        const precio = precioDe({ ...p, categoria_operacion: operaciones[0] }, operaciones[0]);
        if (precio) cambios[`precios.${operaciones[0]}`] = precio;
    }
    const otra = (p.operacionesSolicitud || []).find((o) => o !== operaciones[0] && ['venta', 'alquiler'].includes(o));
    return { cambios, falta: otra || null };
};

async function migrar() {
    await connectDB();
    const viejas = await Property.find(SIN_OPERACIONES).select('title codigoInterno categoria_operacion operacionesSolicitud price moneda priceARS').lean();
    const pendientes = [];
    for (const p of viejas) {
        const { cambios, falta } = cambiosPara(p);
        if (falta) pendientes.push(`  - ${p.title}${p.codigoInterno ? ` (${p.codigoInterno})` : ''}: aceptaba solicitudes de ${falta}, falta cargar su precio`);
        if (!SOLO_PROBAR) await Property.updateOne({ _id: p._id }, { $set: cambios });
    }
    console.log(`${SOLO_PROBAR ? 'Se pasarían' : 'Listo: se pasaron'} ${viejas.length} propiedades al formato nuevo.`);
    if (pendientes.length) {
        console.log('\nPara que figuren en las dos operaciones, editalas en el panel y cargá el precio que falta:');
        pendientes.forEach((linea) => console.log(linea));
    }
}

if (require.main === module) {
    migrar()
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}

module.exports = { cambiosPara };
