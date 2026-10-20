// Pasa a Cloudinary las fotos que se subieron a la carpeta uploads y actualiza sus direcciones en la base.
// Hace falta antes de publicar: en la base quedaron links como http://localhost:4000/uploads/foto.png,
// que en internet no funcionan.
//
// Uso (con CLOUDINARY_URL en el .env):
//   npm run migrar:imagenes -- --probar   → muestra qué cambiaría, sin tocar nada
//   npm run migrar:imagenes               → sube las fotos y actualiza la base

const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Property = require('./models/property.model');
const { usaCloudinary, subirACloudinary } = require('./services/imagenes.service');

const CARPETA_UPLOADS = path.resolve(__dirname, '../uploads');
const SOLO_PROBAR = process.argv.includes('--probar');
const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };

// Nombre del archivo si la dirección apunta a la carpeta uploads del backend
const archivoLocal = (url) => {
    const coincidencia = typeof url === 'string' && url.match(/\/uploads\/([^/?#]+)$/);
    return coincidencia ? decodeURIComponent(coincidencia[1]) : null;
};

async function migrar() {
    if (!usaCloudinary()) {
        throw new Error('Falta CLOUDINARY_URL en backend/.env (se copia del panel de Cloudinary).');
    }
    await connectDB();

    const subidas = new Map(); // archivo → dirección en Cloudinary (una foto usada en varias propiedades se sube una vez)
    const faltantes = new Set();
    let propiedadesCambiadas = 0;

    const propiedades = await Property.find({ 'images.0': { $exists: true } }).select('title images').lean();
    for (const propiedad of propiedades) {
        let cambio = false;
        const nuevas = [];
        for (const url of propiedad.images) {
            const archivo = archivoLocal(url);
            if (!archivo) {
                nuevas.push(url);
                continue;
            }
            const ruta = path.join(CARPETA_UPLOADS, archivo);
            if (!fs.existsSync(ruta)) {
                faltantes.add(`${archivo} (de "${propiedad.title}")`);
                nuevas.push(url);
                continue;
            }
            if (!subidas.has(archivo)) {
                subidas.set(
                    archivo,
                    SOLO_PROBAR
                        ? '(se subiría a Cloudinary)'
                        : await subirACloudinary(fs.readFileSync(ruta), TIPOS[path.extname(archivo).toLowerCase()] || 'image/jpeg', archivo)
                );
                console.log(`  ${archivo} → ${subidas.get(archivo)}`);
            }
            nuevas.push(subidas.get(archivo));
            cambio = true;
        }
        if (cambio) {
            propiedadesCambiadas += 1;
            if (!SOLO_PROBAR) await Property.updateOne({ _id: propiedad._id }, { $set: { images: nuevas } });
        }
    }

    console.log(`\n${SOLO_PROBAR ? 'Prueba: se actualizarían' : '✅ Actualizadas'} ${propiedadesCambiadas} propiedades y ${subidas.size} fotos.`);
    if (faltantes.size) {
        console.log(`⚠️ Estas fotos están en la base pero no en backend/uploads (quedan como estaban):\n  ${[...faltantes].join('\n  ')}`);
    }
    await mongoose.disconnect();
}

migrar().catch(async (error) => {
    console.error('❌ No se pudo migrar:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
