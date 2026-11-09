// Carga EJEMPLOS en la base del sitio para mostrar cómo funciona cada pantalla, pero solo en las secciones que
// están vacías: lo que ya tiene datos no se toca. Pensado para presentar el sitio (por ejemplo, a los profesores).
//
//  - Una propiedad publicada por el dueño que se indique con --dueno (el email de una cuenta que ya existe), con fotos
//    y estadísticas de los últimos 30 días: así ve su publicación en Mi cuenta → Tus publicaciones. Pasa por el mismo
//    proceso que el formulario (solicitud + documentación cifrada + aprobación). No hace falta su contraseña.
//  - Y, si están vacías: visitas, reservas por días, pagos de estadías (con comprobante), reservas con seña,
//    solicitudes, contratos con sus cobros, estadísticas y registro de actividad.
//
// Las personas de los ejemplos son inventadas (mails @demo.test, que no existen: no llegan mails) y sus cuentas tienen
// una contraseña al azar que nadie conoce. Todo lo que se agrega queda anotado en la colección «ejemplos», y
// --quitar lo borra y deja la base como estaba.
//
// Uso (desde la carpeta backend):
//   npm run ejemplos -- --probar --dueno tu@email.com   → se conecta, mira qué está vacío y cuenta qué agregaría (no escribe)
//   npm run ejemplos -- --dueno tu@email.com            → agrega los ejemplos
//   npm run ejemplos -- --quitar                        → borra todo lo que agregó
//
// Ojo: escribe en la base configurada en backend/.env (la real, salvo con USAR_BASE_DEMO=1).

const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cifrar } = require('./utils/cifrado-solicitudes');
const { operacionesDe } = require('./utils/operaciones');
const { normalizarOperaciones } = require('./services/properties.service');
const User = require('./models/user.model');
const Property = require('./models/property.model');
const SolicitudPublicacion = require('./models/solicitudPublicacion.model');
const Visita = require('./models/visita.model');
const Reserva = require('./models/reserva.model');
const Disponibilidad = require('./models/disponibilidad.model');
const Pago = require('./models/pago.model');
const ReservaPropiedad = require('./models/reservaPropiedad.model');
const Solicitud = require('./models/solicitud.model');
const Contrato = require('./models/contrato.model');
const Cobro = require('./models/cobro.model');
const Estadistica = require('./models/estadistica.model');
const Actividad = require('./models/actividad.model');

const ZONA = 'America/Argentina/Buenos_Aires';
const DIA = 86400000;
const COTIZACION = 1400;
const SENA_PORCENTAJE = 30;

// ---------- Registro de lo que se agrega (para poder quitarlo) ----------
const Ejemplo =
    mongoose.models.Ejemplo ||
    mongoose.model(
        'Ejemplo',
        new mongoose.Schema(
            {
                coleccion: { type: String, required: true }, // nombre del modelo
                ids: [mongoose.Schema.Types.ObjectId],
                // Cambios a documentos que ya existían (por ejemplo, una propiedad que pasó a «reservada»)
                restaurar: { type: mongoose.Schema.Types.Mixed, default: null },
            },
            { timestamps: true, versionKey: false }
        ),
        'ejemplos'
    );

// ---------- Fechas relativas a hoy ----------
const diaIso = (desplazamiento = 0) => new Date(Date.now() + desplazamiento * DIA).toLocaleDateString('en-CA', { timeZone: ZONA });
const mesIso = (desplazamiento = 0) => {
    const [a, m] = diaIso().split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1 + desplazamiento, 1));
    return d.toISOString().slice(0, 7);
};
const hace = (dias) => new Date(Date.now() - dias * DIA);

// Números «al azar» pero repetibles
let semilla = 7;
const azar = () => {
    semilla = (semilla * 9301 + 49297) % 233280;
    return semilla / 233280;
};
const entre = (min, max) => Math.floor(min + azar() * (max - min + 1));

const foto = (id) => `https://images.unsplash.com/photo-${id}?w=1800&q=80&fm=jpg&fit=max`;

// ---------- Personas de los ejemplos (inventadas) ----------
const PERSONAS = {
    lucia: { nombre: 'Lucía', apellido: 'Gómez', email: 'lucia.ejemplo@demo.test', telefono: '3434000011' },
    martin: { nombre: 'Martín', apellido: 'Ruiz', email: 'martin.ejemplo@demo.test', telefono: '3434000012' },
    sofia: { nombre: 'Sofía', apellido: 'Benítez', email: 'sofia.ejemplo@demo.test', telefono: '3434000013' },
    diego: { nombre: 'Diego', apellido: 'Acosta', email: 'diego.ejemplo@demo.test', telefono: '3434000014' },
};
const nombreCompleto = (p) => `${p.nombre} ${p.apellido}`.trim();

// Publicación del dueño: venta y alquiler a la vez, con fotos
const PUBLICACION_DUENO = {
    tipoPropiedad: 'casa',
    operacion: 'ambas',
    titulo: 'Casa con galería y patio en Barrio Parque',
    direccion: 'Mitre 230',
    ciudad: 'Villa Libertador San Martín',
    referenciasUbicacion: 'A tres cuadras de la universidad',
    ambientes: 4,
    dormitorios: 2,
    banos: 1,
    superficieTotal: 300,
    superficieCubierta: 110,
    cochera: 'si',
    expensas: 'no',
    comodidades: ['patio', 'lavadero', 'parrilla'],
    otrasComodidades: 'Galería techada al fondo',
    precioPretendido: { monto: 98000, moneda: 'USD' },
    precioAlquiler: { monto: 700000, moneda: 'ARS' },
    descripcion: 'Casa de una planta con living comedor, cocina separada, dos dormitorios y galería con parrilla. Patio con césped y cochera cubierta.',
    fotos: ['1583847268964-b28dc8f51f92', '1687946939402-a02bfa7af289', '1615874959474-d609969a20ed', '1584622650111-993a426fbf0a'].map(foto),
};
// Otra publicación del mismo dueño que queda para revisar en Panel → Publicaciones
const PUBLICACION_PENDIENTE = {
    tipoPropiedad: 'departamento',
    operacion: 'alquiler',
    titulo: 'Departamento de 1 dormitorio cerca del centro',
    direccion: 'San Martín 410',
    ciudad: 'Crespo',
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    superficieTotal: 45,
    superficieCubierta: 45,
    expensas: 'si',
    montoExpensas: 18000,
    comodidades: ['balcon'],
    precioPretendido: { monto: 380000, moneda: 'ARS' },
    descripcion: 'Departamento luminoso al frente, con balcón y cocina integrada.',
    fotos: ['1665249934445-1de680641f50', '1666282167632-c613fbeb163c'].map(foto),
};
// Cabaña de alquiler temporario, solo si en el catálogo no hay ninguna (hace falta para las reservas por días):
// la misma de demo:propiedades, con otro código
const cabanaDeMuestra = () => {
    const { PROPIEDADES, foto: fotoDeMuestra } = require('./demo-propiedades');
    const { fotos, ...datos } = PROPIEDADES.find((p) => p.codigoInterno === 'NI-106');
    return { ...datos, codigoInterno: 'EJ-106', fotos: fotos.map(fotoDeMuestra), estado: 'disponible' };
};

// PDF de comprobante de transferencia (texto, con acentos en WinAnsi). Empieza con %PDF-, como pide el servidor.
const pdfComprobante = (lineas) => {
    const texto = lineas.map((l, i) => `BT /F1 ${i === 0 ? 15 : 11} Tf 40 ${250 - i * 22} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
    const objetos = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 300] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${Buffer.byteLength(texto, 'latin1')} >>\nstream\n${texto}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    ];
    let pdf = '%PDF-1.4\n';
    const posiciones = [];
    objetos.forEach((o, i) => {
        posiciones.push(Buffer.byteLength(pdf, 'latin1'));
        pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
};

// ---------- Armado de cada sección (sin base: devuelve documentos sin guardar) ----------
// ctx: { personas: {clave: User}, venta, alquiler, temporario (propiedades), admin (User o null) }

const datosPropiedad = (p) => ({ id: String(p._id), titulo: p.titulo, direccion: p.ubicacion || p.ciudad || '', precio: p.moneda === 'ARS' ? `$ ${p.precioARS || p.precio}` : `USD ${p.precio}` });

function armarVisitas(ctx) {
    const visita = (persona, propiedad, dias, horario, estado, extra = {}) =>
        new Visita({
            cliente: { nombre: nombreCompleto(ctx.personas[persona]), telefono: ctx.personas[persona].telefono, email: ctx.personas[persona].email },
            propiedad: datosPropiedad(propiedad),
            fecha: diaIso(dias),
            horario,
            duracionMinutos: 30,
            usuario: ctx.personas[persona]._id,
            estado,
            ...extra,
        });
    return [
        visita('lucia', ctx.venta, 1, '10:00', 'pendiente'),
        visita('sofia', ctx.alquiler, 2, '11:30', 'confirmada'),
        visita('diego', ctx.venta, 4, '17:00', 'pendiente'),
        visita('martin', ctx.alquiler, -5, '10:30', 'confirmada'),
    ];
}

// Estadías en la propiedad de alquiler temporario, con las noches tomadas en el calendario
function armarReservas(ctx, cuales = ['pendiente', 'confirmada', 'pasada']) {
    const p = ctx.temporario;
    const noche = p.precioPorNocheUSD || p.precio || 60;
    const limpieza = p.costoLimpiezaUSD || 0;
    const plantilla = {
        pendiente: { persona: 'sofia', desde: 12, noches: 3, estado: 'pendiente', venceHoras: 30, historial: [{ estado: 'pendiente', fecha: hace(1), por: 'cliente' }] },
        confirmada: { persona: 'martin', desde: 25, noches: 4, estado: 'confirmada', venceHoras: 48, historial: [{ estado: 'pendiente', fecha: hace(5), por: 'cliente' }, { estado: 'confirmada', fecha: hace(4), por: 'sistema' }] },
        pasada: { persona: 'diego', desde: -20, noches: 2, estado: 'confirmada', venceHoras: 0, historial: [{ estado: 'pendiente', fecha: hace(30), por: 'cliente' }, { estado: 'confirmada', fecha: hace(29), por: 'admin' }] },
    };
    const reservas = cuales.map((clave) => {
        const r = plantilla[clave];
        const persona = ctx.personas[r.persona];
        return new Reserva({
            propiedad: p._id,
            tituloPropiedad: p.titulo,
            cliente: { usuario: persona._id, nombre: nombreCompleto(persona), email: persona.email, telefono: persona.telefono },
            entrada: diaIso(r.desde),
            salida: diaIso(r.desde + r.noches),
            noches: r.noches,
            huespedes: 2,
            precioPorNocheUSD: noche,
            limpiezaUSD: limpieza,
            totalUSD: noche * r.noches + limpieza,
            estado: r.estado,
            venceEn: new Date(Date.now() + r.venceHoras * 3600000),
            historial: r.historial,
        });
    });
    const noches = reservas.map(
        (r) =>
            new Disponibilidad({
                propiedad: p._id,
                desde: r.entrada,
                hasta: r.salida,
                tipo: r.estado === 'pendiente' ? 'reserva' : 'ocupada',
                reserva: r._id,
                venceEn: r.estado === 'pendiente' ? r.venceEn : null,
                motivo: `Reserva de ${r.cliente.nombre}`,
            })
    );
    return { reservas, noches };
}

// Pagos de estadías: una seña para revisar (con comprobante) y otra acreditada con el saldo pendiente
function armarPagos(reservas) {
    const [pendiente, confirmada, pasada] = reservas;
    const pago = (reserva, tipo, estado, extra = {}) => {
        const montoUSD = tipo === 'sena' ? Math.round(reserva.totalUSD * SENA_PORCENTAJE) / 100 : reserva.totalUSD;
        const montoARS = Math.round(montoUSD * COTIZACION);
        const datos = pdfComprobante([
            'Comprobante de transferencia (EJEMPLO)',
            `Fecha: ${diaIso(-1)}`,
            `Ordenante: ${reserva.cliente.nombre}`,
            'Destinatario: Negocios Inmobiliarios',
            `Importe: $ ${montoARS.toLocaleString('es-AR')}`,
            `Concepto: ${tipo === 'sena' ? 'Seña' : 'Estadía'} ${reserva.tituloPropiedad}`.slice(0, 60),
            'Documento generado para mostrar el sitio.',
        ]);
        return new Pago({
            reserva: reserva._id,
            usuario: reserva.cliente.usuario,
            metodo: 'transferencia',
            tipo,
            estado,
            montoARS,
            montoUSD,
            cotizacion: COTIZACION,
            comprobante: { datos, tipo: 'application/pdf', nombre: 'comprobante-ejemplo.pdf', tamano: datos.length },
            ...extra,
        });
    };
    return [
        pendiente && pago(pendiente, 'sena', 'en_revision'),
        confirmada && pago(confirmada, 'sena', 'aprobado', { aprobadoEn: hace(4) }),
        pasada && pago(pasada, 'total', 'aprobado', { aprobadoEn: hace(29) }),
    ].filter(Boolean);
}

function armarSena(ctx) {
    return new ReservaPropiedad({
        propiedad: ctx.venta._id,
        tituloPropiedad: ctx.venta.titulo,
        operacion: 'venta',
        estadoAnterior: 'disponible',
        cliente: { nombre: nombreCompleto(ctx.personas.martin), email: ctx.personas.martin.email, telefono: ctx.personas.martin.telefono, usuario: ctx.personas.martin._id },
        sena: { monto: 5000, moneda: 'USD', recibidaEl: hace(3) },
        fechaLimite: new Date(Date.now() + 12 * DIA),
        estado: 'activa',
        notas: 'Seña en efectivo (ejemplo). Escritura a coordinar con el escribano.',
    });
}

function armarSolicitudes(ctx) {
    const persona = (p) => ({
        nombre: p.nombre, apellido: p.apellido, dni: '30000000', cuil: '27300000005', domicilio: 'San Martín 100', localidad: 'Libertador San Martín',
        provincia: 'Entre Ríos', telefono: p.telefono, email: p.email, fechaNacimiento: '1995-05-10', ocupacion: 'Docente', ingresosMensuales: 950000,
    });
    const solicitud = (clave, propiedad, operacion, estado, historial, extra = {}) => {
        const p = ctx.personas[clave];
        const datos = { titular: persona(p), incluyeCotitular: false, cotitular: null, ingresosTipo: 'recibos', garantia: operacion === 'alquiler' ? { tipo: 'caucion' } : null };
        return new Solicitud({
            usuario: p._id,
            propiedad: propiedad._id,
            operacion,
            estado,
            historialEstados: historial,
            datosCifrados: cifrar(Buffer.from(JSON.stringify(datos), 'utf8')).toString('base64'),
            claveIdempotencia: `ejemplo-${clave}-${propiedad._id}`,
            ...extra,
        });
    };
    const admin = ctx.admin?._id;
    return [
        solicitud('lucia', ctx.alquiler, 'alquiler', 'pendiente', [{ estado: 'pendiente', fecha: hace(1) }]),
        solicitud('diego', ctx.venta, 'compra', 'falta_documentacion', [
            { estado: 'pendiente', fecha: hace(6) },
            { estado: 'falta_documentacion', fecha: hace(4), comentario: 'Falta el último recibo de sueldo.', ...(admin ? { administradoPor: admin } : {}) },
        ], { documentosSolicitados: ['recibosIngresos'], documentosSolicitadosEn: hace(4), ...(admin ? { documentosSolicitadosPor: admin } : {}) }),
        solicitud('sofia', ctx.venta, 'compra', 'aprobada', [
            { estado: 'pendiente', fecha: hace(15) },
            { estado: 'aprobada', fecha: hace(10), comentario: 'Aprobada. Coordinamos la firma del boleto.', ...(admin ? { administradoPor: admin } : {}) },
        ]),
    ];
}

// Contratos de alquiler: uno al día y, si no había ninguno, otro comercial con un mes atrasado
function armarContratos(ctx, cantidad) {
    const contrato = (numero, clave, tipoContrato, mesesDesdeInicio, duracionMeses, monto) => {
        const p = ctx.personas[clave];
        const inicio = `${mesIso(-mesesDesdeInicio)}-01`;
        const [a, m] = inicio.split('-').map(Number);
        const fin = new Date(Date.UTC(a, m - 1 + duracionMeses, 0)).toISOString().slice(0, 10);
        const duenio = ctx.duenoDe?.(ctx.alquiler);
        return new Contrato({
            numeroContrato: numero,
            cliente: { usuario: p._id, nombre: p.nombre, apellido: p.apellido, telefono: p.telefono, email: p.email, localidad: 'Libertador San Martín', provincia: 'Entre Ríos', dni: '30000000' },
            propietario: duenio || { nombre: 'Propietario', apellido: 'de ejemplo', telefono: '3434000099', localidad: 'Crespo', provincia: 'Entre Ríos' },
            propiedad: { id: ctx.alquiler._id, titulo: ctx.alquiler.titulo, direccion: ctx.alquiler.ubicacion || ctx.alquiler.ciudad || 'Sin dirección' },
            fechaInicio: inicio,
            fechaFin: fin,
            montoMensual: `$ ${monto.toLocaleString('es-AR')}`,
            estado: 'activo',
            tipoContrato,
            duracionMeses,
            ajuste: 'Trimestral',
            diaVencimiento: 10,
            tipoGarantia: 'caucion',
        });
    };
    return [contrato('EJEMPLO-0001', 'lucia', 'Alquiler permanente', 4, 36, 380000), contrato('EJEMPLO-0002', 'diego', 'Comercial', 6, 24, 650000)].slice(0, cantidad);
}

// Estadísticas de los últimos 30 días (sin hoy: los contadores de hoy siguen siendo los de verdad)
function armarEstadisticas(propiedades) {
    const filas = [];
    propiedades.forEach((p, indice) => {
        const interes = 1 + ((indice * 7) % 5);
        for (let d = 1; d <= 30; d += 1) {
            const vistas = entre(0, 4 * interes);
            if (!vistas) continue;
            filas.push(new Estadistica({
                propiedad: p._id,
                dia: diaIso(-d),
                vistas,
                whatsapp: azar() < 0.25 ? entre(1, 2) : 0,
                visitas: azar() < 0.08 ? 1 : 0,
                favoritos: azar() < 0.1 ? 1 : 0,
                solicitudes: azar() < 0.03 ? 1 : 0,
            }));
        }
    });
    return filas;
}

function armarActividad(admin, hechos) {
    return hechos.map(([accion, entidad, doc, dias, detalle]) =>
        new Actividad({ usuario: admin._id, usuarioNombre: nombreCompleto(admin), usuarioRol: admin.rol, accion, entidad, entidadId: String(doc._id), detalle: detalle || '', createdAt: hace(dias) })
    );
}

// ---------- Con la base ----------
const argumento = (nombre) => {
    const i = process.argv.indexOf(nombre);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

async function anotar(modelo, docs, restaurar = null) {
    const ids = docs.map((d) => d._id);
    if (!ids.length && !restaurar) return;
    await Ejemplo.create({ coleccion: modelo.modelName, ids, restaurar });
}

async function personaDeEjemplo(clave) {
    const p = PERSONAS[clave];
    const existente = await User.findOne({ email: p.email });
    if (existente) return { usuario: existente, nuevo: false };
    // Contraseña al azar que nadie conoce: la cuenta existe solo para ser la persona del ejemplo
    const usuario = new User({ ...p, nombreUsuario: p.email.split('@')[0], contrasena: crypto.randomBytes(24).toString('hex'), rol: 'cliente', activo: true, emailVerificado: true, aceptoTerminosEn: hace(60) });
    return { usuario, nuevo: true };
}

const elegir = (lista, operacion, salvo = []) => lista.find((p) => operacionesDe(p).includes(operacion) && !salvo.includes(String(p._id)));

async function publicarDelDueno(dueno, datos, aprobar) {
    const emailService = require('./services/email.service');
    emailService.avisarSolicitudPublicacionAprobada = async () => {};
    emailService.avisarInmobiliaria = async () => {};
    const documentosPublicacion = require('./services/documentosPublicacion.service');
    const servicio = require('./services/solicitudPublicacion.service');
    // Como quien publica desde el sitio, el dueño tiene que tener marcados los requisitos para publicar.
    // Si le faltaban, se marcan y --quitar los deja como estaban.
    const faltan = servicio.REQUISITOS_PUBLICAR.filter((id) => !(dueno.checklistRequisitos || []).includes(id));
    if (faltan.length) {
        const anterior = [...(dueno.checklistRequisitos || [])];
        await anotar(User, [], { usuario: String(dueno._id), checklistRequisitos: anterior });
        await User.updateOne({ _id: dueno._id }, { $addToSet: { checklistRequisitos: { $each: faltan } } });
        dueno.checklistRequisitos = [...anterior, ...faltan];
    }
    const documentos = {};
    for (const clave of ['dni', 'escritura', 'impuestos']) {
        const buffer = pdfComprobante([`Documento de ejemplo: ${clave}`, 'Generado para mostrar el sitio.']);
        const [referencia] = await documentosPublicacion.guardar([{ buffer, mimetype: 'application/pdf', originalname: `${clave}-ejemplo.pdf`, size: buffer.length }], dueno._id);
        documentos[clave] = referencia;
    }
    const contacto = { nombre: dueno.nombre, apellido: dueno.apellido, email: dueno.email, telefono: dueno.telefono || '3434000000', dni: dueno.dni || '' };
    const solicitud = await servicio.crear(dueno._id, { ...datos, documentos, contacto });
    await anotar(SolicitudPublicacion, [solicitud]);
    if (!aprobar) return { solicitud, propiedad: null };
    await servicio.aprobar(solicitud._id);
    const aprobada = await SolicitudPublicacion.findById(solicitud._id).lean();
    const propiedad = await Property.findById(aprobada.propiedadCreada);
    await anotar(Property, [propiedad]);
    return { solicitud: aprobada, propiedad };
}

async function cargar({ probar, emailDueno }) {
    if (await Ejemplo.exists({})) {
        console.log('Ya hay ejemplos cargados. Para cargarlos de nuevo, primero: npm run ejemplos -- --quitar');
        return;
    }
    if (!process.env.SOLICITUDES_ENCRYPTION_KEY) throw new Error('Falta SOLICITUDES_ENCRYPTION_KEY en backend/.env (cifra las solicitudes y los contratos).');

    const dueno = emailDueno ? await User.findOne({ email: String(emailDueno).trim().toLowerCase() }) : null;
    if (emailDueno && !dueno) throw new Error(`No hay ninguna cuenta con el email ${emailDueno}. Registrate primero en el sitio con ese email.`);

    const cuantos = {
        visitas: await Visita.countDocuments(),
        reservas: await Reserva.countDocuments(),
        pagos: await Pago.countDocuments(),
        senas: await ReservaPropiedad.countDocuments(),
        solicitudes: await Solicitud.countDocuments(),
        contratos: await Contrato.countDocuments(),
        cobros: await Cobro.countDocuments(),
        estadisticas: await Estadistica.countDocuments(),
        actividad: await Actividad.countDocuments(),
        pendientes: await SolicitudPublicacion.countDocuments({ estado: 'pendiente' }),
    };
    const duenoYaPublico = dueno ? await SolicitudPublicacion.exists({ cliente: dueno._id, estado: 'aprobada' }) : true;
    const admin = await User.findOne({ rol: 'admin', activo: { $ne: false } }).sort({ createdAt: 1 });

    const plan = [
        [Boolean(dueno) && !duenoYaPublico, `Publicación de ${dueno?.email} (venta y alquiler, con fotos y estadísticas), aprobada`],
        [Boolean(dueno) && cuantos.pendientes === 0, 'Una publicación para revisar en Panel → Publicaciones'],
        [cuantos.visitas === 0, '4 visitas (pendientes y confirmadas)'],
        [cuantos.reservas === 0, '3 reservas por días'],
        [cuantos.pagos === 0, 'Pagos de estadías: una seña para revisar con comprobante y dos acreditados'],
        [cuantos.senas === 0, 'Una reserva con seña (la propiedad queda «reservada» hasta quitar los ejemplos)'],
        [cuantos.solicitudes === 0, '3 solicitudes (pendiente, falta documentación y aprobada)'],
        [cuantos.cobros === 0, `${cuantos.contratos === 0 ? '2 contratos' : '1 contrato'} de alquiler con sus cobros (recibos)`],
        [cuantos.estadisticas === 0, 'Estadísticas de los últimos 30 días de las propiedades del catálogo'],
        [cuantos.actividad === 0 && Boolean(admin), 'Registro de actividad'],
    ];
    console.log(`Base: «${mongoose.connection.name}»\n`);
    console.log('Ya tienen datos (no se tocan): ' + (Object.entries(cuantos).filter(([k, n]) => n > 0 && k !== 'pendientes').map(([k, n]) => `${k} (${n})`).join(', ') || 'ninguna'));
    console.log('\nSe agrega:');
    plan.filter(([si]) => si).forEach(([, texto]) => console.log(`  + ${texto}`));
    if (!plan.some(([si]) => si)) console.log('  (nada: todas las secciones ya tienen datos)');
    if (!emailDueno) console.log('\nSin --dueno no se crea la publicación del dueño. Ej.: npm run ejemplos -- --dueno tu@email.com');
    if (probar) {
        console.log('\nPrueba terminada: no se cambió nada.');
        return;
    }

    // Personas de los ejemplos
    const personas = {};
    const nuevas = [];
    for (const clave of Object.keys(PERSONAS)) {
        const { usuario, nuevo } = await personaDeEjemplo(clave);
        personas[clave] = usuario;
        if (nuevo) nuevas.push(usuario);
    }
    await anotar(User, nuevas);
    for (const u of nuevas) await u.save();

    // Publicaciones del dueño (por el mismo proceso que el formulario)
    let propiedadDueno = null;
    if (dueno && !duenoYaPublico) {
        ({ propiedad: propiedadDueno } = await publicarDelDueno(dueno, PUBLICACION_DUENO, true));
        const estadisticas = armarEstadisticas([propiedadDueno]);
        await anotar(Estadistica, estadisticas);
        await Estadistica.insertMany(estadisticas);
        console.log(`  ✓ Publicación de ${dueno.email}: «${propiedadDueno.titulo}»`);
    }
    if (dueno && cuantos.pendientes === 0) {
        await publicarDelDueno(dueno, PUBLICACION_PENDIENTE, false);
        console.log('  ✓ Publicación para revisar');
    }

    // Propiedades donde van los ejemplos: las del catálogo; si falta alguna, la del dueño o la cabaña de ejemplo
    const catalogo = await Property.find({ estado: 'disponible' }).sort({ orden: 1, createdAt: -1 }).lean();
    const ctx = { personas, admin };
    // La del dueño queda como está (publicada y disponible); se usa solo si no hay otra
    const suya = propiedadDueno ? [String(propiedadDueno._id)] : [];
    ctx.venta = elegir(catalogo, 'venta', suya) || propiedadDueno;
    ctx.alquiler = elegir(catalogo, 'alquiler', suya) || propiedadDueno;
    ctx.temporario = elegir(catalogo, 'temporario');
    ctx.duenoDe = (p) => (propiedadDueno && String(p._id) === String(propiedadDueno._id) ? { usuario: dueno._id, nombre: dueno.nombre, apellido: dueno.apellido, telefono: dueno.telefono || '3434000000', email: dueno.email, localidad: 'Villa Libertador San Martín', provincia: 'Entre Ríos' } : null);
    const necesitaTemporario = cuantos.reservas === 0 || cuantos.pagos === 0;
    if (necesitaTemporario && !ctx.temporario) {
        const cabana = new Property({ ...normalizarOperaciones(cabanaDeMuestra()), orden: 999 });
        await anotar(Property, [cabana]);
        await cabana.save();
        ctx.temporario = cabana.toObject();
        console.log('  ✓ Cabaña de alquiler temporario (no había ninguna en el catálogo)');
    }
    const hechos = [];

    if (cuantos.visitas === 0 && ctx.venta && ctx.alquiler) {
        const visitas = armarVisitas(ctx);
        await anotar(Visita, visitas);
        await Visita.insertMany(visitas);
        hechos.push(['Confirmó la visita', 'visita', visitas[1], 1, visitas[1].propiedad.titulo]);
        console.log(`  ✓ ${visitas.length} visitas`);
    }

    let reservasParaPagos = [];
    if (cuantos.reservas === 0) {
        const { reservas, noches } = armarReservas(ctx);
        await anotar(Reserva, reservas);
        await anotar(Disponibilidad, noches);
        await Reserva.insertMany(reservas);
        await Disponibilidad.insertMany(noches);
        reservasParaPagos = reservas;
        hechos.push(['Confirmó la reserva', 'reserva', reservas[1], 4, reservas[1].tituloPropiedad]);
        console.log(`  ✓ ${reservas.length} reservas por días`);
    }
    if (cuantos.pagos === 0) {
        // Si ya había reservas de verdad, los pagos van en dos reservas de ejemplo propias (no en las reales)
        if (!reservasParaPagos.length) {
            const { reservas, noches } = armarReservas(ctx, ['pendiente', 'confirmada']);
            await anotar(Reserva, reservas);
            await anotar(Disponibilidad, noches);
            await Reserva.insertMany(reservas);
            await Disponibilidad.insertMany(noches);
            reservasParaPagos = reservas;
        }
        const pagos = armarPagos(reservasParaPagos);
        await anotar(Pago, pagos);
        await Pago.insertMany(pagos);
        console.log(`  ✓ ${pagos.length} pagos de estadías (uno con comprobante para revisar)`);
    }

    if (cuantos.senas === 0 && ctx.venta) {
        const sena = armarSena(ctx);
        const anterior = await Property.findById(ctx.venta._id).select('estado').lean();
        await anotar(ReservaPropiedad, [sena], { propiedad: String(ctx.venta._id), estado: anterior?.estado || 'disponible' });
        await sena.save();
        await Property.updateOne({ _id: ctx.venta._id }, { $set: { estado: 'reservado' } });
        hechos.push(['Registró una reserva con seña', 'sena', sena, 3, sena.tituloPropiedad]);
        console.log(`  ✓ Reserva con seña en «${ctx.venta.titulo}»`);
    }

    if (cuantos.solicitudes === 0 && ctx.venta && ctx.alquiler) {
        const solicitudes = armarSolicitudes(ctx);
        await anotar(Solicitud, solicitudes);
        await Solicitud.insertMany(solicitudes);
        hechos.push(['Pidió documentación', 'solicitud', solicitudes[1], 4, 'Falta el último recibo de sueldo.']);
        console.log(`  ✓ ${solicitudes.length} solicitudes`);
    }

    if (cuantos.cobros === 0 && ctx.alquiler) {
        const contratos = armarContratos(ctx, cuantos.contratos === 0 ? 2 : 1);
        await anotar(Contrato, contratos);
        for (const c of contratos) await c.save();
        const cobros = require('./services/cobros.service');
        // Al día: pagó los meses anteriores. Comercial: le falta el mes pasado (figura atrasado)
        for (let m = 4; m >= 1; m -= 1) await cobros.registrarPago(String(contratos[0]._id), mesIso(-m), { medio: 'transferencia', pagadoEl: `${mesIso(-m)}-08` });
        if (contratos[1]) for (let m = 6; m >= 2; m -= 1) await cobros.registrarPago(String(contratos[1]._id), mesIso(-m), { medio: 'efectivo', pagadoEl: `${mesIso(-m)}-10` });
        const creados = await Cobro.find({ contrato: { $in: contratos.map((c) => c._id) } }).select('_id').lean();
        await anotar(Cobro, creados);
        console.log(`  ✓ ${contratos.length} contrato${contratos.length > 1 ? 's' : ''} con ${creados.length} cobros`);
    }

    if (cuantos.estadisticas === 0) {
        const propias = new Set([propiedadDueno && String(propiedadDueno._id)]);
        const propiedades = (await Property.find().select('_id').lean()).filter((p) => !propias.has(String(p._id)));
        const estadisticas = armarEstadisticas(propiedades);
        await anotar(Estadistica, estadisticas);
        await Estadistica.insertMany(estadisticas);
        console.log(`  ✓ Estadísticas de ${propiedades.length} propiedades`);
    }

    if (cuantos.actividad === 0 && admin && hechos.length) {
        const actividad = armarActividad(admin, hechos);
        await anotar(Actividad, actividad);
        await Actividad.insertMany(actividad, { timestamps: false });
        console.log(`  ✓ ${actividad.length} acciones en el registro de actividad`);
    }

    console.log('\n✅ Ejemplos cargados. Para sacarlos: npm run ejemplos -- --quitar');
}

async function quitar({ probar }) {
    const anotados = await Ejemplo.find().sort({ createdAt: -1 }).lean();
    if (!anotados.length) {
        console.log('No hay ejemplos cargados.');
        return;
    }
    for (const a of anotados) {
        if (a.ids.length) console.log(`  ${probar ? 'Se borrarían' : 'Borrando'}: ${a.ids.length} de ${a.coleccion}`);
        if (a.restaurar?.propiedad) console.log(`  ${probar ? 'Se devolvería' : 'Se devuelve'} la propiedad reservada a «${a.restaurar.estado}»`);
        if (a.restaurar?.usuario) console.log(`  ${probar ? 'Se devolverían' : 'Se devuelven'} los requisitos marcados del dueño a como estaban`);
    }
    if (probar) return;
    const documentosPublicacion = require('./services/documentosPublicacion.service');
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosPublicaciones' });
    for (const a of anotados) {
        const modelo = mongoose.model(a.coleccion);
        if (a.coleccion === 'SolicitudPublicacion') {
            const solicitudes = await SolicitudPublicacion.find({ _id: { $in: a.ids } }).select('+documentos').lean();
            for (const referencia of solicitudes.flatMap((s) => Object.values(s.documentos || {}))) {
                const id = documentosPublicacion.idDeReferencia(referencia);
                if (id) await bucket.delete(new mongoose.Types.ObjectId(id)).catch(() => {});
            }
        }
        await modelo.deleteMany({ _id: { $in: a.ids } });
        if (a.restaurar?.propiedad) await Property.updateOne({ _id: a.restaurar.propiedad, estado: 'reservado' }, { $set: { estado: a.restaurar.estado } });
        if (a.restaurar?.usuario) await User.updateOne({ _id: a.restaurar.usuario }, { $set: { checklistRequisitos: a.restaurar.checklistRequisitos || [] } });
    }
    await Ejemplo.deleteMany({});
    console.log('\n✅ Listo: se borraron todos los ejemplos.');
}

if (require.main === module) {
    const probar = process.argv.includes('--probar');
    (async () => {
        await require('./config/database')();
        try {
            if (process.argv.includes('--quitar')) await quitar({ probar });
            else await cargar({ probar, emailDueno: argumento('--dueno') });
        } finally {
            await mongoose.disconnect();
        }
    })().catch((error) => {
        console.error('❌ No se pudieron cargar los ejemplos:', error.message);
        process.exit(1);
    });
}

module.exports = { pdfComprobante, armarVisitas, armarReservas, armarPagos, armarSena, armarSolicitudes, armarContratos, armarEstadisticas, armarActividad, PUBLICACION_DUENO, PUBLICACION_PENDIENTE, cabanaDeMuestra, PERSONAS };
