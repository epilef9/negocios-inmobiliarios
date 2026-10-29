// Carga solicitudes de publicación de muestra recorriendo el proceso real, para probar y presentar el panel:
//   1. Crea 3 propietarios de muestra (mails @example.com, sin contraseña conocida: no se puede entrar con ellos).
//   2. Sube su documentación cifrada (PDFs de muestra) igual que el formulario.
//   3. Crea 6 solicitudes con el mismo servicio que usa el formulario (pasan por todas las validaciones).
//   4. Aprueba 2 (se crean sus propiedades en el catálogo) y rechaza 1. Las otras 3 quedan pendientes.
// No manda mails: los avisos al propietario se saltean en este script.
//
// Ojo: escribe en la base que esté configurada en backend/.env (o sea, la real).
//
// Uso (desde la carpeta backend):
//   npm run demo:publicaciones -- --probar   → muestra qué haría, sin tocar nada
//   npm run demo:publicaciones               → carga las solicitudes de muestra
//   npm run demo:publicaciones -- --quitar   → borra solo lo de muestra (propietarios, solicitudes, documentos
//                                              y las propiedades creadas al aprobarlas)
//
// Se puede correr varias veces: si una solicitud de muestra ya existe, no la duplica.

const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./config/database');
const User = require('./models/user.model');
const Property = require('./models/property.model');
const SolicitudPublicacion = require('./models/solicitudPublicacion.model');
const emailService = require('./services/email.service');
const documentosPublicacion = require('./services/documentosPublicacion.service');
const servicio = require('./services/solicitudPublicacion.service');

const SOLO_PROBAR = process.argv.includes('--probar');
const QUITAR = process.argv.includes('--quitar');

// Los avisos por mail no se mandan desde acá
emailService.avisarSolicitudPublicacionAprobada = async () => {};
emailService.avisarSolicitudPublicacionRechazada = async () => {};

const REQUISITOS = ['pub-escritura', 'pub-planos', 'pub-impuestos', 'pub-reglamento', 'pub-datos', 'pub-desc', 'pub-fotos', 'pub-precio', 'pub-condiciones', 'pub-autorizacion', 'pub-disponibilidad'];
const foto = (id) => `https://images.unsplash.com/photo-${id}?w=1800&q=80&fm=jpg&fit=max`;

const PROPIETARIOS = {
    marta: { email: 'demo.marta.gonzalez@example.com', nombre: 'Marta', apellido: 'González', telefono: '3434112233', dni: '23111222' },
    ricardo: { email: 'demo.ricardo.weber@example.com', nombre: 'Ricardo', apellido: 'Weber', telefono: '3435223344', dni: '27333444' },
    laura: { email: 'demo.laura.schmidt@example.com', nombre: 'Laura', apellido: 'Schmidt', telefono: '3436334455', dni: '31555666' },
};

// resultado: lo que se hace después de crearla (pendiente, aprobar o rechazar con un motivo)
const SOLICITUDES = [
    {
        duenio: 'marta',
        resultado: 'pendiente',
        documentos: ['dni', 'escritura', 'impuestos', 'planos'],
        datos: {
            tipoPropiedad: 'casa', operacion: 'venta', titulo: 'Casa de 3 dormitorios con galería y parque',
            direccion: 'Juan B. Alberdi 512', ciudad: 'Villa Libertador San Martín', referenciasUbicacion: 'A dos cuadras de la plaza principal',
            ambientes: 5, dormitorios: 3, banos: 2, superficieTotal: 450, superficieCubierta: 160, cochera: 'si',
            expensas: 'no', comodidades: ['patio', 'parque', 'quincho', 'lavadero'], otrasComodidades: 'Galería con parrilla',
            precioPretendido: { monto: 95000, moneda: 'USD' },
            descripcion: 'Casa luminosa de una planta, con galería al fondo y parque arbolado. Techos nuevos, aberturas de aluminio y gas natural.',
            fotos: ['1653569511862-8a0320ae66cc', '1583847268964-b28dc8f51f92', '1687946939402-a02bfa7af289', '1615874959474-d609969a20ed'].map(foto),
        },
    },
    {
        duenio: 'ricardo',
        resultado: 'pendiente',
        documentos: ['dni', 'escritura', 'impuestos', 'reglamento'],
        datos: {
            tipoPropiedad: 'departamento', operacion: 'alquiler', titulo: 'Departamento de 2 dormitorios con balcón',
            direccion: 'San Martín 845', ciudad: 'Crespo', referenciasUbicacion: 'Frente al banco, edificio con portero',
            ambientes: 3, dormitorios: 2, banos: 1, superficieTotal: 68, superficieCubierta: 62, cochera: 'no', pisoUnidad: '2° B',
            expensas: 'si', montoExpensas: 35000, comodidades: ['balcon', 'lavadero'],
            precioPretendido: { monto: 450000, moneda: 'ARS' },
            descripcion: 'Departamento al frente, muy luminoso, con balcón corrido y cocina separada. Ideal para pareja o estudiantes.',
            fotos: ['1665249934445-1de680641f50', '1666282167632-c613fbeb163c', '1725905803121-dd123b058a5c'].map(foto),
        },
    },
    {
        duenio: 'laura',
        resultado: 'pendiente',
        documentos: ['dni', 'escritura', 'impuestos'],
        datos: {
            tipoPropiedad: 'terreno', operacion: 'venta', titulo: 'Lote de 12 x 30 m con todos los servicios',
            direccion: 'Los Paraísos s/n', ciudad: 'Diamante', referenciasUbicacion: 'Barrio Las Colinas, a 300 m de la ruta',
            superficieTotal: 360, expensas: 'no', otrasComodidades: 'Agua, luz y gas en el frente. Calle de ripio.',
            precioPretendido: { monto: 18000, moneda: 'USD' },
            descripcion: 'Lote plano y escriturado, listo para construir, en barrio tranquilo con vista al río.',
            fotos: ['1598722818387-cbdaa0dc58d2', '1653167970204-27cd0efc716f'].map(foto),
        },
    },
    {
        duenio: 'marta',
        resultado: 'aprobar',
        documentos: ['dni', 'escritura', 'impuestos', 'reglamento'],
        datos: {
            tipoPropiedad: 'departamento', operacion: 'temporario', titulo: 'Monoambiente amoblado cerca de la UAP',
            direccion: '25 de Mayo 210', ciudad: 'Villa Libertador San Martín', referenciasUbicacion: 'A una cuadra de la universidad',
            ambientes: 1, dormitorios: 0, banos: 1, superficieTotal: 32, superficieCubierta: 32, cochera: 'no', pisoUnidad: 'PB 3',
            expensas: 'si', montoExpensas: 12000, comodidades: ['amoblado', 'aire_acondicionado'],
            precioPretendido: { monto: 40, moneda: 'USD' },
            descripcion: 'Monoambiente equipado para estadías cortas: cama doble, cocina completa, wifi y ropa de cama.',
            fotos: ['1702014862053-946a122b920d', '1663756915304-40b7eda63e41', '1650894622076-e09ab837c502'].map(foto),
        },
    },
    {
        duenio: 'ricardo',
        resultado: 'aprobar',
        documentos: ['dni', 'escritura', 'impuestos', 'planos'],
        datos: {
            tipoPropiedad: 'local', operacion: 'alquiler', titulo: 'Local comercial de 85 m² sobre avenida',
            direccion: 'Av. Independencia 1320', ciudad: 'Crespo', referenciasUbicacion: 'Esquina con buena circulación',
            ambientes: 2, banos: 1, superficieTotal: 85, superficieCubierta: 85, cochera: 'no',
            expensas: 'no', otrasComodidades: 'Vidriera de 6 m y depósito al fondo',
            precioPretendido: { monto: 600000, moneda: 'ARS' },
            descripcion: 'Local en planta baja con vidriera amplia, baño y depósito. Apto para comercio o consultorio.',
            fotos: ['1783987597078-84d5ac51d518'].map(foto),
        },
    },
    {
        duenio: 'laura',
        resultado: 'rechazar',
        motivo: 'La escritura está a nombre de otra persona. Mandanos la declaratoria de herederos o la autorización del titular y la volvemos a revisar.',
        documentos: ['dni', 'escritura', 'impuestos'],
        datos: {
            tipoPropiedad: 'casa', operacion: 'venta', titulo: 'Casa quinta en una hectárea',
            direccion: 'Camino a Puiggari km 2', ciudad: 'Villa Libertador San Martín',
            ambientes: 4, dormitorios: 2, banos: 1, superficieTotal: 10000, superficieCubierta: 120, cochera: 'si',
            expensas: 'no', comodidades: ['parque', 'pileta', 'quincho'],
            precioPretendido: { monto: 150000, moneda: 'USD' },
            descripcion: 'Casa quinta con pileta, quincho y monte de frutales. Pozo de agua propio y luz trifásica.',
            fotos: ['1706408126103-51d1241ecf0d', '1750016064807-10aa86dac43d', '1605774337664-7a846e9cdf17'].map(foto),
        },
    },
];

const EMAILS = Object.values(PROPIETARIOS).map((p) => p.email);

// PDF mínimo válido (empieza con %PDF-) para cada documento de muestra
const pdfDeMuestra = (texto) => {
    const contenido = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 120] /Contents 4 0 R >> endobj\n4 0 obj << /Length ${texto.length + 30} >> stream\nBT /F1 12 Tf 20 60 Td (${texto}) Tj ET\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`;
    const buffer = Buffer.from(contenido);
    return { buffer, mimetype: 'application/pdf', originalname: 'muestra.pdf', size: buffer.length };
};

async function propietario(clave) {
    const datos = PROPIETARIOS[clave];
    const existente = await User.findOne({ email: datos.email });
    if (existente) return existente;
    if (SOLO_PROBAR) return { _id: new mongoose.Types.ObjectId(), ...datos };
    // Contraseña al azar que nadie conoce: la cuenta existe solo para ser dueña de las solicitudes
    const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    return User.create({ ...datos, password, role: 'cliente', emailVerificado: true, checklistRequisitos: REQUISITOS });
}

async function quitar() {
    const usuarios = await User.find({ email: { $in: EMAILS } }).select('_id email').lean();
    const ids = usuarios.map((u) => u._id);
    const solicitudes = await SolicitudPublicacion.find({ cliente: { $in: ids } }).select('+documentos').lean();
    const propiedades = solicitudes.map((s) => s.propiedadCreada).filter(Boolean);
    const referencias = solicitudes.flatMap((s) => Object.values(s.documentos || {})).filter(Boolean);

    console.log(`${SOLO_PROBAR ? 'Se borrarían' : 'Borrando'}: ${usuarios.length} propietarios, ${solicitudes.length} solicitudes, ${propiedades.length} propiedades y ${referencias.length} documentos de muestra.`);
    solicitudes.forEach((s) => console.log(`  - ${s.titulo}`));
    if (SOLO_PROBAR) return;

    await Property.deleteMany({ _id: { $in: propiedades } });
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosPublicaciones' });
    for (const referencia of referencias) {
        const id = documentosPublicacion.idDeReferencia(referencia);
        if (id) await bucket.delete(new mongoose.Types.ObjectId(id)).catch(() => {});
    }
    await SolicitudPublicacion.deleteMany({ _id: { $in: solicitudes.map((s) => s._id) } });
    await User.deleteMany({ _id: { $in: ids } });
    console.log('\n✅ Listo: se borró todo lo de muestra.');
}

async function cargar() {
    let creadas = 0;
    for (const muestra of SOLICITUDES) {
        const duenio = await propietario(muestra.duenio);
        const ya = SOLO_PROBAR && !duenio.save ? null : await SolicitudPublicacion.findOne({ cliente: duenio._id, titulo: muestra.datos.titulo }).select('_id estado').lean();
        if (ya) {
            console.log(`  Ya estaba (${ya.estado}): ${muestra.datos.titulo}`);
            continue;
        }
        if (SOLO_PROBAR) {
            console.log(`  Se crearía${muestra.resultado === 'pendiente' ? '' : ` y se ${muestra.resultado === 'aprobar' ? 'aprobaría' : 'rechazaría'}`}: ${muestra.datos.titulo} (${muestra.datos.ciudad})`);
            continue;
        }

        // Documentación: se sube de a uno, cifrada, como en el formulario
        const documentos = {};
        for (const clave of muestra.documentos) {
            const [referencia] = await documentosPublicacion.guardar([pdfDeMuestra(`Documento de muestra: ${clave}`)], duenio._id);
            documentos[clave] = referencia;
        }

        const contacto = { nombre: duenio.nombre, apellido: duenio.apellido, email: duenio.email, telefono: duenio.telefono, dni: duenio.dni };
        const solicitud = await servicio.crear(duenio._id, { ...muestra.datos, documentos, contacto });
        let estado = 'pendiente';
        if (muestra.resultado === 'aprobar') {
            await servicio.aprobar(solicitud._id);
            estado = 'aprobada (propiedad creada en el catálogo)';
        } else if (muestra.resultado === 'rechazar') {
            await servicio.rechazar(solicitud._id, muestra.motivo);
            estado = 'rechazada';
        }
        creadas += 1;
        console.log(`  Creada: ${muestra.datos.titulo} → ${estado}`);
    }
    console.log(`\n${SOLO_PROBAR ? 'Prueba terminada: no se cambió nada.' : `✅ Listo: ${creadas} solicitudes de muestra nuevas.`}`);
}

(async () => {
    await connectDB();
    try {
        if (QUITAR) await quitar();
        else await cargar();
    } finally {
        await mongoose.disconnect();
    }
})().catch((error) => {
    console.error('❌ No se pudieron cargar las solicitudes de muestra:', error.message);
    process.exit(1);
});
