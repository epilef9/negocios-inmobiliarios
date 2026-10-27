// Pagos de reservas (HU-41): Mercado Pago (Checkout Pro: la tarjeta se carga en Mercado Pago, nunca pasa por
// nuestro sitio) o transferencia con comprobante que confirma el administrador.
// Credenciales por variables de entorno: MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET (nunca en el código).
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Pago = require('../models/pago.model');
const Reserva = require('../models/reserva.model');
const Disponibilidad = require('../models/disponibilidad.model');
const ajustes = require('./ajustes.service');
const emailService = require('./email.service');
const config = require('../config/env');
const { ahoraEnArgentina } = require('./agenda.service');

const API_MP = 'https://api.mercadopago.com';
const TAMANO_MAXIMO = 4 * 1024 * 1024;
const HORAS_REVISION = 48;

class ErrorPago extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

// ---------- Cotización ----------
let cotizacionCache = null;
const cotizacionDolar = async () => {
    if (cotizacionCache && Date.now() - cotizacionCache.en < 10 * 60 * 1000) return cotizacionCache.valor;
    try {
        const r = await fetch('https://dolarapi.com/v1/dolares/blue', { signal: AbortSignal.timeout(5000) });
        const valor = Number((await r.json()).venta);
        if (!Number.isFinite(valor) || valor <= 0) throw new Error('cotización inválida');
        cotizacionCache = { valor, en: Date.now() };
        return valor;
    } catch (error) {
        if (cotizacionCache) return cotizacionCache.valor;
        console.error('[pagos] No se pudo consultar el dólar:', error.message);
        throw new ErrorPago(503, 'No pudimos consultar la cotización del dólar. Probá de nuevo en unos minutos.');
    }
};

// Pesos a pagar: total en dólares de la reserva × cotización, redondeado al peso
const montoDe = (totalUSD, cotizacion) => Math.round(Number(totalUSD) * Number(cotizacion));

// ---------- Archivos ----------
// Tipo real del comprobante por sus primeros bytes (no por lo que diga el navegador)
const tipoDeArchivo = (buffer) => {
    if (!buffer || buffer.length < 12) return null;
    if (buffer.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    return null;
};

// ---------- Mercado Pago ----------
const mpConfigurado = () => Boolean(process.env.MP_ACCESS_TOKEN);

// Firma del webhook: "ts=...,v1=..." = HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con la clave secreta
const firmaValida = ({ firma, requestId, dataId, secreto }) => {
    if (!firma || !secreto) return false;
    const partes = Object.fromEntries(String(firma).split(',').map((p) => p.split('=').map((x) => x.trim())));
    if (!partes.ts || !partes.v1) return false;
    const plantilla = `id:${String(dataId || '').toLowerCase()};request-id:${requestId || ''};ts:${partes.ts};`;
    const esperado = crypto.createHmac('sha256', secreto).update(plantilla).digest('hex');
    const a = Buffer.from(esperado);
    const b = Buffer.from(partes.v1);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const estadoDesdeMP = (estado) =>
    ({ approved: 'aprobado', authorized: 'pendiente', in_process: 'pendiente', in_mediation: 'pendiente', pending: 'pendiente', rejected: 'rechazado', cancelled: 'cancelado', refunded: 'cancelado', charged_back: 'cancelado' })[estado] || 'pendiente';

const llamarMP = async (ruta, opciones = {}) => {
    const r = await fetch(`${API_MP}${ruta}`, {
        ...opciones,
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) },
        signal: AbortSignal.timeout(10000),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Mercado Pago respondió ${r.status}: ${cuerpo.message || ''}`);
    return cuerpo;
};

// ---------- Reserva del cliente ----------
const reservaPagable = async (reservaId, usuarioId) => {
    if (!mongoose.isValidObjectId(reservaId)) throw new ErrorPago(400, 'Reserva inválida.');
    const reserva = await Reserva.findOne({ _id: reservaId, 'cliente.usuario': usuarioId }).lean();
    if (!reserva) throw new ErrorPago(404, 'No encontramos esa reserva en tu cuenta.');
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) throw new ErrorPago(409, 'Esta reserva ya no se puede pagar.');
    if (reserva.salida <= ahoraEnArgentina().fecha) throw new ErrorPago(409, 'La estadía ya terminó.');
    if (await Pago.exists({ reserva: reserva._id, estado: 'aprobado' })) throw new ErrorPago(409, 'Esta reserva ya está pagada.');
    return reserva;
};

const resumenPago = (p) =>
    p && { id: String(p._id), reserva: String(p.reserva), metodo: p.metodo, estado: p.estado, montoARS: p.montoARS, montoUSD: p.montoUSD, nota: p.nota, createdAt: p.createdAt };

// Lo que ve el cliente antes de pagar: monto en pesos y las formas disponibles
const opciones = async (reservaId, usuarioId) => {
    const reserva = await reservaPagable(reservaId, usuarioId);
    const cotizacion = await cotizacionDolar();
    const a = await ajustes.leer();
    const ultimo = await Pago.findOne({ reserva: reserva._id }).sort({ createdAt: -1 }).lean();
    return {
        montoUSD: reserva.totalUSD,
        cotizacion,
        montoARS: montoDe(reserva.totalUSD, cotizacion),
        mercadoPago: mpConfigurado(),
        transferencia: ajustes.bancoCompleto(a.banco) ? a.banco : null,
        pagoActual: resumenPago(ultimo),
    };
};

// Pagos del cliente (para mostrar el estado en Mi cuenta)
const mios = async (usuarioId) => (await Pago.find({ usuario: usuarioId }).sort({ createdAt: -1 }).limit(100).lean()).map(resumenPago);

const crearPreferencia = async (reservaId, usuario) => {
    if (!mpConfigurado()) throw new ErrorPago(503, 'El pago con Mercado Pago todavía no está habilitado.');
    const reserva = await reservaPagable(reservaId, usuario._id);
    const cotizacion = await cotizacionDolar();
    const montoARS = montoDe(reserva.totalUSD, cotizacion);
    const pago = await Pago.create({ reserva: reserva._id, usuario: usuario._id, metodo: 'mercadopago', montoARS, montoUSD: reserva.totalUSD, cotizacion });
    const sitio = config.urlFrontend();
    const preferencia = await llamarMP('/checkout/preferences', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': String(pago._id) },
        body: JSON.stringify({
            items: [{ id: String(reserva._id), title: `Reserva: ${reserva.tituloPropiedad}`.slice(0, 250), quantity: 1, currency_id: 'ARS', unit_price: montoARS }],
            payer: { email: usuario.email },
            external_reference: String(pago._id),
            back_urls: { success: `${sitio}/reservas?pago=aprobado`, pending: `${sitio}/reservas?pago=pendiente`, failure: `${sitio}/reservas?pago=rechazado` },
            auto_return: 'approved',
            notification_url: `${process.env.MP_NOTIFICACION_URL || `${sitio}/api/pagos/webhook`}`,
            statement_descriptor: 'NEGOCIOS INMOB',
            expires: true,
            expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }),
    });
    await Pago.updateOne({ _id: pago._id }, { $set: { mpPreferencia: preferencia.id } });
    // Con credenciales de prueba se usa el checkout de prueba
    const dePrueba = String(process.env.MP_ACCESS_TOKEN).startsWith('TEST-');
    return { url: dePrueba ? preferencia.sandbox_init_point || preferencia.init_point : preferencia.init_point };
};

const avisarPagoAprobado = (pago, reserva) =>
    emailService
        .avisarInmobiliaria({
            asunto: `Pago acreditado · ${reserva?.tituloPropiedad || 'Reserva'}`,
            intro: `Se acreditó el pago de una reserva (${pago.metodo === 'mercadopago' ? 'Mercado Pago' : 'transferencia'}).`,
            filas: [
                ['Cliente', reserva?.cliente?.nombre || ''],
                ['Estadía', reserva ? `${reserva.entrada} → ${reserva.salida}` : ''],
                ['Monto', `ARS ${pago.montoARS.toLocaleString('es-AR')} (USD ${pago.montoUSD})`],
            ],
            enlace: `${config.urlFrontend()}/admin/reservas`,
            boton: 'Ver las reservas',
        })
        .catch((e) => console.error('[pagos] No se pudo avisar el pago:', e.message));

// Pago aprobado: si la reserva estaba pendiente, se confirma sola (las noches quedan ocupadas)
const alAprobar = async (pago, por) => {
    const reserva = await Reserva.findById(pago.reserva).lean();
    if (reserva && reserva.estado !== 'confirmada') {
        try {
            await require('./reservas.service').confirmar(reserva._id, { por, nota: 'Confirmada al acreditarse el pago' });
        } catch (error) {
            console.error('[pagos] Pago aprobado pero no se pudo confirmar la reserva:', error.message);
        }
    }
    avisarPagoAprobado(pago, reserva);
};

// Notificación de Mercado Pago. Se consulta el pago a Mercado Pago (no se cree lo que dice la notificación).
const webhook = async ({ cuerpo, query, firma, requestId }) => {
    const tipo = cuerpo?.type || query?.type || query?.topic;
    const dataId = cuerpo?.data?.id || query?.['data.id'] || query?.id;
    if (tipo !== 'payment' || !dataId) return { ignorado: true };
    const secreto = process.env.MP_WEBHOOK_SECRET;
    if (secreto ? !firmaValida({ firma, requestId, dataId, secreto }) : config.enProduccion()) {
        throw new ErrorPago(401, 'Firma inválida');
    }
    const mp = await llamarMP(`/v1/payments/${encodeURIComponent(dataId)}`);
    if (!mongoose.isValidObjectId(mp.external_reference)) return { ignorado: true };
    const pago = await Pago.findById(mp.external_reference);
    if (!pago || pago.metodo !== 'mercadopago') return { ignorado: true };
    // El importe acreditado tiene que ser el que calculó el servidor
    const montoOk = mp.currency_id === 'ARS' && Number(mp.transaction_amount) >= pago.montoARS - 1;
    const nuevo = montoOk ? estadoDesdeMP(mp.status) : 'rechazado';
    const yaAprobado = pago.estado === 'aprobado';
    pago.mpPago = String(mp.id);
    pago.mpEstado = String(mp.status || '');
    pago.estado = yaAprobado && nuevo === 'pendiente' ? 'aprobado' : nuevo;
    if (!montoOk) pago.nota = 'El importe acreditado no coincide con el de la reserva';
    if (pago.estado === 'aprobado' && !yaAprobado) pago.aprobadoEn = new Date();
    await pago.save();
    if (pago.estado === 'aprobado' && !yaAprobado) await alAprobar(pago, 'sistema');
    return { estado: pago.estado };
};

// ---------- Transferencia ----------
const subirComprobante = async (reservaId, usuario, archivo) => {
    const reserva = await reservaPagable(reservaId, usuario._id);
    const a = await ajustes.leer();
    if (!ajustes.bancoCompleto(a.banco)) throw new ErrorPago(503, 'El pago por transferencia todavía no está habilitado.');
    if (!archivo?.buffer?.length) throw new ErrorPago(400, 'Adjuntá el comprobante (PDF o foto).');
    if (archivo.buffer.length > TAMANO_MAXIMO) throw new ErrorPago(413, 'El comprobante puede pesar hasta 4 MB.');
    const tipo = tipoDeArchivo(archivo.buffer);
    if (!tipo) throw new ErrorPago(415, 'El comprobante tiene que ser un PDF o una foto JPG, PNG o WEBP.');
    const cotizacion = await cotizacionDolar();
    const datos = {
        reserva: reserva._id,
        usuario: usuario._id,
        metodo: 'transferencia',
        estado: 'en_revision',
        montoARS: montoDe(reserva.totalUSD, cotizacion),
        montoUSD: reserva.totalUSD,
        cotizacion,
        comprobante: { datos: archivo.buffer, tipo, nombre: String(archivo.originalname || 'comprobante').replace(/[^\w.\- ]+/g, '_').slice(0, 80), tamano: archivo.buffer.length },
        nota: '',
    };
    // Un solo comprobante en revisión por reserva: uno nuevo reemplaza al anterior
    const pago = await Pago.findOneAndUpdate({ reserva: reserva._id, metodo: 'transferencia', estado: { $in: ['en_revision', 'rechazado'] } }, { $set: datos }, { new: true, upsert: true });

    // Mientras se revisa, la reserva pendiente no vence (se le dan 48 h más si hacía falta)
    if (reserva.estado === 'pendiente') {
        const minimo = new Date(Date.now() + HORAS_REVISION * 3600 * 1000);
        if (new Date(reserva.venceEn) < minimo) {
            await Reserva.updateOne({ _id: reserva._id, estado: 'pendiente' }, { $set: { venceEn: minimo } });
            await Disponibilidad.updateMany({ reserva: reserva._id, tipo: 'reserva' }, { $set: { venceEn: minimo } });
        }
    }
    emailService
        .avisarInmobiliaria({
            asunto: `Comprobante de transferencia · ${reserva.tituloPropiedad}`,
            intro: 'Un cliente subió el comprobante de la transferencia de su reserva. Revisalo y confirmá el pago desde el panel.',
            filas: [
                ['Cliente', reserva.cliente?.nombre || ''],
                ['Estadía', `${reserva.entrada} → ${reserva.salida}`],
                ['Monto esperado', `ARS ${pago.montoARS.toLocaleString('es-AR')}`],
            ],
            enlace: `${config.urlFrontend()}/admin/reservas`,
            boton: 'Revisar el pago',
        })
        .catch((e) => console.error('[pagos] No se pudo avisar el comprobante:', e.message));
    return resumenPago(pago);
};

// ---------- Administrador ----------
const listarAdmin = async () => (await Pago.find().sort({ createdAt: -1 }).limit(300).lean()).map((p) => ({ ...resumenPago(p), tieneComprobante: Boolean(p.comprobante?.tamano), mpEstado: p.mpEstado }));

const comprobante = async (id) => {
    if (!mongoose.isValidObjectId(id)) return null;
    const p = await Pago.findById(id).select('+comprobante.datos comprobante').lean();
    return p?.comprobante?.datos ? { datos: Buffer.from(p.comprobante.datos.buffer || p.comprobante.datos), tipo: p.comprobante.tipo, nombre: p.comprobante.nombre } : null;
};

const revisarTransferencia = async (id, aprobar, nota = '') => {
    if (!mongoose.isValidObjectId(id)) throw new ErrorPago(400, 'Pago inválido.');
    const pago = await Pago.findOneAndUpdate(
        { _id: id, metodo: 'transferencia', estado: 'en_revision' },
        { $set: { estado: aprobar ? 'aprobado' : 'rechazado', nota: String(nota || '').trim().slice(0, 300), ...(aprobar ? { aprobadoEn: new Date() } : {}) } },
        { new: true }
    );
    if (!pago) throw new ErrorPago(409, 'Ese comprobante ya no está en revisión.');
    if (aprobar) await alAprobar(pago, 'admin');
    else {
        const reserva = await Reserva.findById(pago.reserva).select('cliente tituloPropiedad').lean();
        if (reserva?.cliente?.email) {
            emailService
                .avisarCliente({
                    para: reserva.cliente.email,
                    nombre: reserva.cliente.nombre,
                    asunto: 'Revisamos tu comprobante de transferencia',
                    parrafos: [`No pudimos validar el comprobante de tu reserva en ${reserva.tituloPropiedad}.`, pago.nota ? `Motivo: ${pago.nota}` : 'Escribinos y lo vemos juntos.', 'Podés subir otro comprobante desde Mi cuenta.'],
                    boton: 'Ver mis reservas',
                    enlace: `${config.urlFrontend()}/reservas`,
                })
                .catch((e) => console.error('[pagos] No se pudo avisar el rechazo:', e.message));
        }
    }
    return resumenPago(pago);
};

module.exports = {
    ErrorPago,
    montoDe,
    tipoDeArchivo,
    firmaValida,
    estadoDesdeMP,
    opciones,
    mios,
    crearPreferencia,
    webhook,
    subirComprobante,
    listarAdmin,
    comprobante,
    revisarTransferencia,
};
