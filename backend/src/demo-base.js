// Llena una base de DEMO con datos de muestra para presentar el sitio funcionando, sin tocar la base real:
// propiedades con fotos, clientes, un empleado, visitas, reservas por días y con seña, solicitudes, contratos con
// sus cobros, estadísticas de los últimos 30 días, favoritos y registro de actividad.
//
// La base sale de MONGODB_URI_DEMO (no de MONGODB_URI) y su nombre tiene que incluir "demo" o "test"
// (ver utils/base-demo.js). Cada corrida BORRA esa base y la vuelve a llenar.
//
// Uso (desde la carpeta backend):
//   npm run demo:base -- --probar   → arma y valida todos los datos sin conectarse a ninguna base
//   npm run demo:base               → borra la base de demo y la llena
//   npm run dev:demo                → levanta el backend contra la base de demo para presentar
//
// Contraseña de las cuentas de demo: DEMO_CLAVE en backend/.env, o una al azar que se muestra al terminar.
// Los datos de las personas son inventados y las cuentas usan el dominio reservado demo.test (no llegan mails).

const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { uriDemo, nombreDeBase } = require('./utils/base-demo');
const { PROPIEDADES, foto } = require('./demo-propiedades');
const { normalizarOperaciones } = require('./services/properties.service');
const { cifrar } = require('./utils/cifrado-solicitudes');
const User = require('./models/user.model');
const Property = require('./models/property.model');
const Visita = require('./models/visita.model');
const Reserva = require('./models/reserva.model');
const ReservaPropiedad = require('./models/reservaPropiedad.model');
const Solicitud = require('./models/solicitud.model');
const Contrato = require('./models/contrato.model');
const Estadistica = require('./models/estadistica.model');
const Actividad = require('./models/actividad.model');
const Ajustes = require('./models/ajustes.model');

const SOLO_PROBAR = process.argv.includes('--probar');
const ZONA = 'America/Argentina/Buenos_Aires';
const DIA = 86400000;

// ---------- Fechas relativas a hoy (así la demo nunca queda vieja) ----------
const diaIso = (desplazamientoDias = 0) => new Date(Date.now() + desplazamientoDias * DIA).toLocaleDateString('en-CA', { timeZone: ZONA });
const mesIso = (desplazamientoMeses = 0) => {
    const [a, m] = diaIso().split('-').map(Number);
    const fecha = new Date(Date.UTC(a, m - 1 + desplazamientoMeses, 1));
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
};
const hace = (dias) => new Date(Date.now() - dias * DIA);

// Números «al azar» pero repetibles: la demo sale igual cada vez
let semilla = 20261109;
const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
};
const entre = (min, max) => Math.floor(min + azar() * (max - min + 1));

// ---------- Personas de la demo (inventadas) ----------
const PERSONAS = {
    admin: { nombre: 'Araceli', apellido: 'Demo', email: 'admin@demo.test', telefono: '3434000001', rol: 'admin' },
    empleado: { nombre: 'Martina', apellido: 'Sosa', email: 'empleada@demo.test', telefono: '3434000002', rol: 'empleado', permisos: ['propiedades', 'visitas', 'horario', 'reservas', 'solicitudes'] },
    lucia: { nombre: 'Lucía', apellido: 'Gómez', email: 'lucia@demo.test', telefono: '3434000011', rol: 'cliente' },
    martin: { nombre: 'Martín', apellido: 'Ruiz', email: 'martin@demo.test', telefono: '3434000012', rol: 'cliente' },
    sofia: { nombre: 'Sofía', apellido: 'Benítez', email: 'sofia@demo.test', telefono: '3434000013', rol: 'cliente' },
    diego: { nombre: 'Diego', apellido: 'Acosta', email: 'diego@demo.test', telefono: '3434000014', rol: 'cliente' },
};

const nombreCompleto = (p) => `${p.nombre} ${p.apellido}`;

async function armar(clave) {
    // ---------- Usuarios ----------
    const usuarios = {};
    for (const [clavePersona, p] of Object.entries(PERSONAS)) {
        usuarios[clavePersona] = new User({
            ...p,
            nombreUsuario: p.email.split('@')[0],
            contrasena: clave,
            activo: true,
            emailVerificado: true,
            aceptoTerminosEn: hace(60),
        });
    }

    // ---------- Propiedades (las mismas de demo:propiedades, con las fotos de Unsplash) ----------
    const propiedades = {};
    PROPIEDADES.forEach(({ fotos, ...datos }, indice) => {
        propiedades[datos.codigoInterno] = new Property({
            ...normalizarOperaciones(datos),
            fotos: fotos.map(foto),
            orden: indice + 1,
            createdAt: hace(90 - indice * 7),
        });
    });
    const P = (codigo) => propiedades[codigo];
    // Algunas ocupadas, para que se vean los distintos estados
    P('NI-102').estado = 'alquilado';
    P('NI-109').estado = 'alquilado';
    P('NI-104').estado = 'reservado';

    // Favoritos de los clientes
    usuarios.lucia.favoritos = [P('NI-101')._id, P('NI-103')._id, P('NI-106')._id];
    usuarios.sofia.favoritos = [P('NI-107')._id, P('NI-101')._id];
    usuarios.martin.favoritos = [P('NI-104')._id];

    const datosPropiedad = (p) => ({ id: String(p._id), titulo: p.titulo, direccion: p.ubicacion || p.ciudad, precio: p.moneda === 'ARS' ? `$ ${p.precioARS}` : `USD ${p.precio}` });

    // ---------- Visitas ----------
    const visita = (persona, propiedad, dias, horario, estado, extra = {}) =>
        new Visita({
            cliente: { nombre: nombreCompleto(PERSONAS[persona]), telefono: PERSONAS[persona].telefono, email: PERSONAS[persona].email },
            propiedad: datosPropiedad(P(propiedad)),
            fecha: diaIso(dias),
            horario,
            duracionMinutos: 30,
            usuario: usuarios[persona]._id,
            estado,
            ...extra,
        });
    const visitas = [
        visita('lucia', 'NI-101', 1, '10:00', 'pendiente'),
        visita('sofia', 'NI-107', 1, '11:30', 'confirmada', { asistencia: { respuesta: 'confirmo', respondidaEn: hace(0) } }),
        visita('martin', 'NI-103', 2, '17:00', 'confirmada'),
        visita('diego', 'NI-108', 4, '09:30', 'pendiente'),
        visita('lucia', 'NI-104', -6, '10:30', 'confirmada'),
        visita('sofia', 'NI-105', -3, '16:00', 'cancelada', { canceladaEn: hace(4), motivoCancelacion: 'Le surgió un viaje.' }),
    ];

    // ---------- Reservas por días (alquiler temporario, NI-106) ----------
    const precioNoche = P('NI-106').precioPorNocheUSD || 60;
    const limpieza = P('NI-106').costoLimpiezaUSD || 0;
    const estadia = (persona, desde, noches, estado, venceEnHoras, historial) =>
        new Reserva({
            propiedad: P('NI-106')._id,
            tituloPropiedad: P('NI-106').titulo,
            cliente: { usuario: usuarios[persona]._id, nombre: nombreCompleto(PERSONAS[persona]), email: PERSONAS[persona].email, telefono: PERSONAS[persona].telefono },
            entrada: diaIso(desde),
            salida: diaIso(desde + noches),
            noches,
            huespedes: 2,
            precioPorNocheUSD: precioNoche,
            limpiezaUSD: limpieza,
            totalUSD: precioNoche * noches + limpieza,
            estado,
            venceEn: new Date(Date.now() + venceEnHoras * 3600000),
            historial,
        });
    const reservas = [
        estadia('sofia', 12, 3, 'pendiente', 20, [{ estado: 'pendiente', fecha: hace(1), por: 'cliente' }]),
        estadia('martin', 25, 4, 'confirmada', 48, [{ estado: 'pendiente', fecha: hace(5), por: 'cliente' }, { estado: 'confirmada', fecha: hace(4), por: 'admin' }]),
        estadia('diego', -20, 2, 'confirmada', 0, [{ estado: 'pendiente', fecha: hace(30), por: 'cliente' }, { estado: 'confirmada', fecha: hace(29), por: 'admin' }]),
    ];

    // ---------- Reserva con seña (NI-104, en venta) ----------
    const senas = [
        new ReservaPropiedad({
            propiedad: P('NI-104')._id,
            tituloPropiedad: P('NI-104').titulo,
            operacion: 'venta',
            estadoAnterior: 'disponible',
            cliente: { nombre: nombreCompleto(PERSONAS.martin), email: PERSONAS.martin.email, telefono: PERSONAS.martin.telefono, usuario: usuarios.martin._id },
            sena: { monto: 5000, moneda: 'USD', recibidaEl: hace(3) },
            fechaLimite: new Date(Date.now() + 12 * DIA),
            estado: 'activa',
            notas: 'Seña en efectivo. Escritura a coordinar con el escribano.',
        }),
    ];

    // ---------- Solicitudes (sin archivos: en la demo no se suben documentos) ----------
    const persona = (p, extra = {}) => ({
        nombre: p.nombre, apellido: p.apellido, dni: '30000000', cuil: '27300000005', domicilio: 'San Martín 100', localidad: 'Libertador San Martín',
        provincia: 'Entre Ríos', telefono: p.telefono, email: p.email, fechaNacimiento: '1995-05-10', ocupacion: 'Docente', ingresosMensuales: 950000, ...extra,
    });
    const solicitud = (clavePersona, propiedad, operacion, estado, historial, extra = {}) => {
        const p = PERSONAS[clavePersona];
        const datos = { titular: persona(p), incluyeCotitular: false, cotitular: null, ingresosTipo: 'recibos', garantia: operacion === 'alquiler' ? { tipo: 'caucion' } : null };
        return new Solicitud({
            usuario: usuarios[clavePersona]._id,
            propiedad: P(propiedad)._id,
            operacion,
            estado,
            historialEstados: historial,
            datosCifrados: cifrar(Buffer.from(JSON.stringify(datos), 'utf8')).toString('base64'),
            claveIdempotencia: `demo-${clavePersona}-${propiedad}`,
            ...extra,
        });
    };
    const solicitudes = [
        solicitud('lucia', 'NI-103', 'alquiler', 'pendiente', [{ estado: 'pendiente', fecha: hace(1) }]),
        solicitud('diego', 'NI-101', 'compra', 'falta_documentacion', [
            { estado: 'pendiente', fecha: hace(6) },
            { estado: 'falta_documentacion', fecha: hace(4), comentario: 'Falta el último recibo de sueldo.', administradoPor: usuarios.admin._id },
        ], { documentosSolicitados: ['recibosIngresos'], documentosSolicitadosEn: hace(4), documentosSolicitadosPor: usuarios.admin._id }),
        solicitud('sofia', 'NI-107', 'compra', 'aprobada', [
            { estado: 'pendiente', fecha: hace(15) },
            { estado: 'aprobada', fecha: hace(10), comentario: 'Aprobada. Coordinamos la firma del boleto.', administradoPor: usuarios.admin._id },
        ]),
    ];

    // ---------- Contratos de alquiler (con cobros) ----------
    const contrato = (numero, clavePersona, propiedad, tipoContrato, mesesDesdeInicio, duracionMeses, monto, extra = {}) => {
        const p = PERSONAS[clavePersona];
        const inicio = `${mesIso(-mesesDesdeInicio)}-01`;
        const [a, m] = inicio.split('-').map(Number);
        const fin = new Date(Date.UTC(a, m - 1 + duracionMeses, 0)).toISOString().slice(0, 10);
        return new Contrato({
            numeroContrato: numero,
            cliente: { usuario: usuarios[clavePersona]._id, nombre: p.nombre, apellido: p.apellido, telefono: p.telefono, email: p.email, localidad: 'Libertador San Martín', provincia: 'Entre Ríos', dni: '30000000' },
            propietario: { nombre: 'Propietario', apellido: 'de muestra', telefono: '3434000099', localidad: 'Crespo', provincia: 'Entre Ríos' },
            propiedad: { id: P(propiedad)._id, titulo: P(propiedad).titulo, direccion: P(propiedad).ubicacion || P(propiedad).ciudad },
            fechaInicio: inicio,
            fechaFin: fin,
            montoMensual: `$ ${monto.toLocaleString('es-AR')}`,
            estado: 'activo',
            tipoContrato,
            duracionMeses,
            ajuste: 'Trimestral',
            diaVencimiento: 10,
            tipoGarantia: 'caucion',
            ...extra,
        });
    };
    // Uno al día y otro comercial que vence pronto (aparece en los recordatorios)
    const contratos = [
        contrato('DEMO-0001', 'lucia', 'NI-102', 'Alquiler permanente', 5, 36, 380000),
        contrato('DEMO-0002', 'diego', 'NI-109', 'Comercial', 22, 24, 650000),
    ];

    // ---------- Estadísticas: últimos 30 días ----------
    const estadisticas = [];
    for (const [indice, p] of Object.values(propiedades).entries()) {
        const interes = 1 + ((indice * 7) % 5); // unas propiedades atraen más que otras
        for (let d = 0; d < 30; d += 1) {
            const vistas = entre(0, 4 * interes);
            if (!vistas) continue;
            estadisticas.push(new Estadistica({
                propiedad: p._id,
                dia: diaIso(-d),
                vistas,
                whatsapp: azar() < 0.25 ? entre(1, 2) : 0,
                visitas: azar() < 0.08 ? 1 : 0,
                favoritos: azar() < 0.1 ? 1 : 0,
                solicitudes: azar() < 0.03 ? 1 : 0,
            }));
        }
    }

    // ---------- Registro de actividad ----------
    const accion = (quien, texto, entidad, doc, dias, detalle = '') =>
        new Actividad({ usuario: usuarios[quien]._id, usuarioNombre: nombreCompleto(PERSONAS[quien]), usuarioRol: PERSONAS[quien].rol, accion: texto, entidad, entidadId: String(doc._id), detalle, createdAt: hace(dias) });
    const actividad = [
        accion('admin', 'Confirmó la reserva', 'reserva', reservas[1], 4, reservas[1].tituloPropiedad),
        accion('admin', 'Registró una reserva con seña', 'sena', senas[0], 3, senas[0].tituloPropiedad),
        accion('empleado', 'Confirmó la visita', 'visita', visitas[1], 1, visitas[1].propiedad.titulo),
        accion('admin', 'Pidió documentación', 'solicitud', solicitudes[1], 4, 'Falta el último recibo de sueldo.'),
        accion('admin', 'Aprobó la solicitud', 'solicitud', solicitudes[2], 10),
    ];

    // ---------- Datos del sitio: la calculadora activada con valores de ejemplo ----------
    const ajustes = new Ajustes({
        _id: new mongoose.Types.ObjectId('000000000000000000000038'),
        costos: {
            publicado: true,
            alquiler: { mesesDeposito: 1, honorariosPorcentaje: 3, selladoPorcentaje: 1, gastosFijosARS: 0 },
            venta: { honorariosPorcentaje: 3, escrituraPorcentaje: 3, senaPorcentaje: 10 },
        },
    });

    return { usuarios, propiedades, visitas, reservas, senas, solicitudes, contratos, estadisticas, actividad, ajustes };
}

// Valida cada documento con su modelo (sin base): así --probar avisa si algún dato no cumple el esquema
async function validar(datos) {
    const errores = [];
    const todos = [
        ...Object.values(datos.usuarios), ...Object.values(datos.propiedades), ...datos.visitas, ...datos.reservas, ...datos.senas,
        ...datos.solicitudes, ...datos.contratos, ...datos.estadisticas, ...datos.actividad, datos.ajustes,
    ];
    for (const doc of todos) {
        try {
            await doc.validate();
        } catch (error) {
            errores.push(`${doc.constructor.modelName}: ${Object.values(error.errors || {}).map((e) => e.message).join('; ') || error.message}`);
        }
    }
    return { cantidad: todos.length, errores };
}

async function llenar() {
    const uri = uriDemo();
    const clave = process.env.DEMO_CLAVE || `Demo-${crypto.randomBytes(4).toString('hex')}`;
    if (!process.env.SOLICITUDES_ENCRYPTION_KEY) throw new Error('Falta SOLICITUDES_ENCRYPTION_KEY en backend/.env (cifra los datos de las solicitudes y los contratos).');

    const datos = await armar(clave);
    const { cantidad, errores } = await validar(datos);
    if (errores.length) {
        errores.forEach((e) => console.error(`  ✗ ${e}`));
        throw new Error(`${errores.length} documentos no cumplen el esquema.`);
    }
    console.log(`✓ ${cantidad} documentos armados y validados.`);
    if (SOLO_PROBAR) {
        console.log(`Prueba terminada: no se conectó a ninguna base. Con la de verdad se borraría y llenaría «${nombreDeBase(uri)}».`);
        return;
    }

    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 15000 });
    console.log(`Conectado a la base de demo «${mongoose.connection.name}». Se borra y se vuelve a llenar…`);
    await mongoose.connection.dropDatabase();
    // Los índices (únicos) se crean antes de cargar, como en la base real
    await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).createIndexes()));

    // Los usuarios con save(): así se guarda el hash de la contraseña
    for (const u of Object.values(datos.usuarios)) await u.save();
    await Property.insertMany(Object.values(datos.propiedades));
    await Visita.insertMany(datos.visitas);
    await Reserva.insertMany(datos.reservas);
    await ReservaPropiedad.insertMany(datos.senas);
    await Solicitud.insertMany(datos.solicitudes);
    for (const c of datos.contratos) await c.save();
    await Estadistica.insertMany(datos.estadisticas);
    await Actividad.insertMany(datos.actividad, { timestamps: false });
    await datos.ajustes.save();

    // Cobros: los meses ya pasados pagados; al comercial le falta el mes anterior (aparece atrasado)
    const cobros = require('./services/cobros.service');
    const [contratoAlDia, contratoAtrasado] = datos.contratos;
    for (let m = 5; m >= 1; m -= 1) await cobros.registrarPago(String(contratoAlDia._id), mesIso(-m), { medio: 'transferencia', pagadoEl: `${mesIso(-m)}-08` });
    for (let m = 6; m >= 2; m -= 1) await cobros.registrarPago(String(contratoAtrasado._id), mesIso(-m), { medio: 'efectivo', pagadoEl: `${mesIso(-m)}-10` });

    console.log('\n✅ Base de demo lista.');
    console.log('   Cuentas (todas con la misma contraseña):');
    Object.values(PERSONAS).forEach((p) => console.log(`   - ${p.email.padEnd(22)} ${p.rol}`));
    console.log(`   Contraseña: ${clave}${process.env.DEMO_CLAVE ? ' (la de DEMO_CLAVE)' : ' (generada ahora; para fijarla, poné DEMO_CLAVE en backend/.env)'}`);
    console.log('\n   Para presentar: npm run dev:demo (backend) y npm run dev (frontend).');
}

llenar()
    .catch((error) => {
        console.error('❌ No se pudo armar la base de demo:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect().catch(() => {}));
