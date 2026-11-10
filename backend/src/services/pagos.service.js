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
const redondearUSD = (n) => Math.round(Number(n) * 100) / 100;
const NOMBRE_TIPO = { sena: 'seña', total: 'total de la estadía', saldo: 'saldo' };

// Cuánto se pagó ya (pagos acreditados) y cuánto falta, en dólares
const cuentaDe = async (reserva) => {
    const aprobados = await Pago.find({ reserva: reserva._id, estado: 'aprobado' }).select('montoUSD').lean();
    const pagadoUSD = redondearUSD(aprobados.reduce((suma, p) => suma + (Number(p.montoUSD) || 0), 0));
    return { pagadoUSD, restanteUSD: Math.max(0, redondearUSD(reserva.totalUSD - pagadoUSD)) };
};

// Qué puede pagar ahora: sin pagos, la seña (si hay porcentaje) o el total; con la seña pagada, el saldo
const opcionesDeMonto = (reserva, { pagadoUSD, restanteUSD }, senaPorcentaje) => {
    if (pagadoUSD > 0) return [{ tipo: 'saldo', montoUSD: restanteUSD }];
    const pct = Number(senaPorcentaje) || 0;
    const lista = [];
    if (pct > 0 && pct < 100) lista.push({ tipo: 'sena', montoUSD: Math.max(0.01, redondearUSD((reserva.totalUSD * pct) / 100)) });
    lista.push({ tipo: 'total', montoUSD: redondearUSD(reserva.totalUSD) });
    return lista;
};

const reservaPagable = async (reservaId, usuarioId) => {
    if (!mongoose.isValidObjectId(reservaId)) throw new ErrorPago(400, 'Reserva inválida.');
    const reserva = await Reserva.findOne({ _id: reservaId, 'cliente.usuario': usuarioId }).lean();
    if (!reserva) throw new ErrorPago(404, 'No encontramos esa reserva en tu cuenta.');
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) throw new ErrorPago(409, 'Esta reserva ya no se puede pagar.');
    if (reserva.salida <= ahoraEnArgentina().fecha) throw new ErrorPago(409, 'La estadía ya terminó.');
    const cuenta = await cuentaDe(reserva);
    if (cuenta.restanteUSD <= 0.009) throw new ErrorPago(409, 'Esta reserva ya está pagada.');
    return { reserva, cuenta };
};

// El tipo que pidió el cliente tiene que ser uno de los que corresponden ahora; el monto sale de acá, no del navegador
const montoElegido = async (reserva, cuenta, tipo) => {
    const a = await ajustes.leer();
    const disponibles = opcionesDeMonto(reserva, cuenta, a.estadias?.senaPorcentaje);
    const elegido = disponibles.find((o) => o.tipo === tipo) || (tipo === undefined && disponibles.length === 1 ? disponibles[0] : null);
    if (!elegido) throw new ErrorPago(400, 'Elegí si pagás la seña o el total de la estadía.');
    return elegido;
};

const resumenPago = (p) =>
    p && {
        id: String(p._id),
        reserva: String(p.reserva?._id || p.reserva),
        metodo: p.metodo,
        tipo: p.tipo || 'total',
        estado: p.estado,
        montoARS: p.montoARS,
        montoUSD: p.montoUSD,
        nota: p.nota,
        tieneComprobante: Boolean(p.comprobante?.tamano),
        // Mercado Pago ya informó este pago (por el aviso automático o al volver del checkout)
        informadoPorMP: Boolean(p.mpPago),
        createdAt: p.createdAt,
    };

// Lo que ve el cliente antes de pagar: lo que puede pagar (seña, total o saldo) en pesos y las formas disponibles
const opciones = async (reservaId, usuarioId) => {
    const { reserva, cuenta } = await reservaPagable(reservaId, usuarioId);
    const cotizacion = await cotizacionDolar();
    const a = await ajustes.leer();
    const ultimo = await Pago.findOne({ reserva: reserva._id, estado: { $ne: 'cancelado' } }).sort({ createdAt: -1 }).lean();
    const montos = opcionesDeMonto(reserva, cuenta, a.estadias?.senaPorcentaje).map((o) => ({ ...o, montoARS: montoDe(o.montoUSD, cotizacion) }));
    return {
        totalUSD: reserva.totalUSD,
        pagadoUSD: cuenta.pagadoUSD,
        restanteUSD: cuenta.restanteUSD,
        senaPorcentaje: Number(a.estadias?.senaPorcentaje) || 0,
        cotizacion,
        montos,
        // Compatibilidad: el monto de la opción más completa
        montoUSD: montos[montos.length - 1].montoUSD,
        montoARS: montos[montos.length - 1].montoARS,
        mercadoPago: mpConfigurado(),
        transferencia: ajustes.bancoCompleto(a.banco) ? a.banco : null,
        pagoActual: resumenPago(ultimo),
    };
};

// Pagos del cliente (para mostrar el estado en Mi cuenta)
const mios = async (usuarioId) => (await Pago.find({ usuario: usuarioId }).sort({ createdAt: -1 }).limit(100).lean()).map(resumenPago);

const crearPreferencia = async (reservaId, usuario, tipo) => {
    if (!mpConfigurado()) throw new ErrorPago(503, 'El pago con Mercado Pago todavía no está habilitado.');
    const { reserva, cuenta } = await reservaPagable(reservaId, usuario._id);
    const elegido = await montoElegido(reserva, cuenta, tipo);
    const cotizacion = await cotizacionDolar();
    const montoARS = montoDe(elegido.montoUSD, cotizacion);
    // Si había un intento anterior sin terminar (nunca se pagó), queda cancelado: vale el nuevo
    await Pago.updateMany({ reserva: reserva._id, usuario: usuario._id, metodo: 'mercadopago', estado: 'pendiente', mpPago: '' }, { $set: { estado: 'cancelado', nota: 'Se reemplazó por otro intento de pago' } });
    const pago = await Pago.create({ reserva: reserva._id, usuario: usuario._id, metodo: 'mercadopago', tipo: elegido.tipo, montoARS, montoUSD: elegido.montoUSD, cotizacion });
    const sitio = config.urlFrontend();
    // Al volver, Mercado Pago suma payment_id y status a estas direcciones: con eso se verifica el pago aunque el
    // aviso automático (webhook) no llegue, por ejemplo probando en la computadora
    const avisoMP = process.env.MP_NOTIFICACION_URL || (sitio.startsWith('https://') ? `${sitio}/api/pagos/webhook` : '');
    const volver = (estado) => `${sitio}/reservas?pago=${estado}&ref=${pago._id}`;
    const preferencia = await llamarMP('/checkout/preferences', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': String(pago._id) },
        body: JSON.stringify({
            items: [{ id: String(reserva._id), title: `${elegido.tipo === 'sena' ? 'Seña' : elegido.tipo === 'saldo' ? 'Saldo' : 'Estadía'}: ${reserva.tituloPropiedad}`.slice(0, 250), quantity: 1, currency_id: 'ARS', unit_price: montoARS }],
            // Sin payer.email: el que paga inicia sesión en Mercado Pago. Mandar el email de la cuenta del sitio
            // (una persona real) rompe los pagos de prueba («una de las partes es de prueba»).
            external_reference: String(pago._id),
            back_urls: { success: volver('aprobado'), pending: volver('pendiente'), failure: volver('rechazado') },
            // Mercado Pago solo vuelve solo al sitio si la dirección es https (en la computadora se vuelve con el botón)
            ...(sitio.startsWith('https://') ? { auto_return: 'approved' } : {}),
            // El aviso automático necesita una dirección pública: en la compu (localhost) no se manda y el pago se
            // verifica al volver del checkout
            ...(avisoMP ? { notification_url: avisoMP } : {}),
            statement_descriptor: 'NEGOCIOS INMOB',
            expires: true,
            expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }),
    });
    await Pago.updateOne({ _id: pago._id }, { $set: { mpPreferencia: preferencia.id } });
    // Con credenciales de prueba se usa el checkout de prueba
    const dePrueba = String(process.env.MP_ACCESS_TOKEN).startsWith('TEST-');
    return { url: dePrueba ? preferencia.sandbox_init_point || preferencia.init_point : preferencia.init_point, pago: String(pago._id) };
};

const avisarPagoAprobado = (pago, reserva) =>
    emailService
        .avisarInmobiliaria({
            asunto: `Pago acreditado · ${reserva?.tituloPropiedad || 'Reserva'}`,
            intro: `Se acreditó ${pago.tipo === 'sena' ? 'la seña' : pago.tipo === 'saldo' ? 'el saldo' : 'el pago'} de una reserva (${pago.metodo === 'mercadopago' ? 'Mercado Pago' : 'transferencia'}).`,
            filas: [
                ['Cliente', reserva?.cliente?.nombre || ''],
                ['Estadía', reserva ? `${reserva.entrada} → ${reserva.salida}` : ''],
                ['Pago', NOMBRE_TIPO[pago.tipo] || 'total'],
                ['Monto', `ARS ${pago.montoARS.toLocaleString('es-AR')} (USD ${pago.montoUSD})`],
            ],
            enlace: `${config.urlFrontend()}/admin/cobros?tipo=estadias`,
            boton: 'Ver los pagos',
        })
        .catch((e) => console.error('[pagos] No se pudo avisar el pago:', e.message));

// Pago aprobado (seña, total o saldo): si la reserva estaba pendiente, se confirma sola y esos días quedan reservados
const alAprobar = async (pago, por) => {
    const reserva = await Reserva.findById(pago.reserva).lean();
    if (reserva && reserva.estado !== 'confirmada') {
        try {
            const nota = pago.tipo === 'sena' ? 'Confirmada al acreditarse la seña' : 'Confirmada al acreditarse el pago';
            await require('./reservas.service').confirmar(reserva._id, { por, nota });
        } catch (error) {
            console.error('[pagos] Pago aprobado pero no se pudo confirmar la reserva:', error.message);
        }
    }
    avisarPagoAprobado(pago, reserva);
};

// Aplica a un pago nuestro lo que informa Mercado Pago (desde el webhook o al volver del checkout).
// Se consulta el pago a Mercado Pago: nunca se cree lo que dice el navegador ni la notificación.
const aplicarPagoMP = async (pago, mp) => {
    // El importe acreditado tiene que ser el que calculó el servidor
    const montoOk = mp.currency_id === 'ARS' && Number(mp.transaction_amount) >= pago.montoARS - 1;
    const nuevo = montoOk ? estadoDesdeMP(mp.status) : 'rechazado';
    const yaAprobado = pago.estado === 'aprobado';
    pago.mpPago = String(mp.id);
    pago.mpEstado = String(mp.status || '');
    // Un aprobado no vuelve atrás; uno con comprobante en revisión sigue en revisión mientras Mercado Pago diga «pendiente»
    if (yaAprobado && nuevo === 'pendiente') pago.estado = 'aprobado';
    else if (pago.estado === 'en_revision' && nuevo === 'pendiente') pago.estado = 'en_revision';
    else pago.estado = nuevo;
    if (!montoOk) pago.nota = 'El importe acreditado no coincide con el de la reserva';
    if (pago.estado === 'aprobado' && !yaAprobado) pago.aprobadoEn = new Date();
    await pago.save();
    if (pago.estado === 'aprobado' && !yaAprobado) await alAprobar(pago, 'sistema');
    return pago;
};

// Notificación de Mercado Pago
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
    await aplicarPagoMP(pago, mp);
    return { estado: pago.estado };
};

// Al volver de Mercado Pago: el cliente manda el número de pago que le dio Mercado Pago y el servidor lo consulta
const verificarMP = async (pagoId, usuario, paymentId) => {
    if (!mpConfigurado()) throw new ErrorPago(503, 'El pago con Mercado Pago todavía no está habilitado.');
    if (!mongoose.isValidObjectId(pagoId) || !/^\d{1,20}$/.test(String(paymentId || ''))) throw new ErrorPago(400, 'Pago inválido.');
    const pago = await Pago.findOne({ _id: pagoId, usuario: usuario._id, metodo: 'mercadopago' });
    if (!pago) throw new ErrorPago(404, 'No encontramos ese pago en tu cuenta.');
    if (pago.estado === 'aprobado') return resumenPago(pago);
    const mp = await llamarMP(`/v1/payments/${encodeURIComponent(paymentId)}`);
    // El pago de Mercado Pago tiene que ser el de este intento (si no, alguien está probando con otro número)
    if (String(mp.external_reference) !== String(pago._id)) throw new ErrorPago(409, 'Ese pago de Mercado Pago no corresponde a esta reserva.');
    return resumenPago(await aplicarPagoMP(pago, mp));
};

// ---------- Comprobantes ----------
const leerComprobante = (archivo) => {
    if (!archivo?.buffer?.length) throw new ErrorPago(400, 'Adjuntá el comprobante (foto o PDF).');
    if (archivo.buffer.length > TAMANO_MAXIMO) throw new ErrorPago(413, 'El comprobante puede pesar hasta 4 MB.');
    const tipo = tipoDeArchivo(archivo.buffer);
    if (!tipo) throw new ErrorPago(415, 'El comprobante tiene que ser una foto JPG, PNG o WEBP, o un PDF.');
    return { datos: archivo.buffer, tipo, nombre: String(archivo.originalname || 'comprobante').replace(/[^\w.\- ]+/g, '_').slice(0, 80), tamano: archivo.buffer.length };
};

// Mientras se revisa un comprobante, la reserva pendiente no vence (se le dan 48 h más si hacía falta)
const estirarVencimiento = async (reserva) => {
    if (reserva.estado !== 'pendiente') return;
    const minimo = new Date(Date.now() + HORAS_REVISION * 3600 * 1000);
    if (new Date(reserva.venceEn) < minimo) {
        await Reserva.updateOne({ _id: reserva._id, estado: 'pendiente' }, { $set: { venceEn: minimo } });
        await Disponibilidad.updateMany({ reserva: reserva._id, tipo: 'reserva' }, { $set: { venceEn: minimo } });
    }
};

const avisarComprobante = (reserva, pago) =>
    emailService
        .avisarInmobiliaria({
            asunto: `Comprobante de pago · ${reserva.tituloPropiedad}`,
            intro: `Un cliente subió el comprobante de ${pago.tipo === 'sena' ? 'la seña' : pago.tipo === 'saldo' ? 'el saldo' : 'el pago'} de su reserva (${pago.metodo === 'mercadopago' ? 'Mercado Pago' : 'transferencia'}). Revisalo y confirmá el pago desde Cobros.`,
            filas: [
                ['Cliente', reserva.cliente?.nombre || ''],
                ['Estadía', `${reserva.entrada} → ${reserva.salida}`],
                ['Monto esperado', `ARS ${pago.montoARS.toLocaleString('es-AR')}`],
            ],
            enlace: `${config.urlFrontend()}/admin/cobros?tipo=estadias`,
            boton: 'Revisar el pago',
        })
        .catch((e) => console.error('[pagos] No se pudo avisar el comprobante:', e.message));

// Transferencia: el cliente elige seña o total y sube el comprobante
const subirComprobante = async (reservaId, usuario, archivo, tipoPedido) => {
    const { reserva, cuenta } = await reservaPagable(reservaId, usuario._id);
    const a = await ajustes.leer();
    if (!ajustes.bancoCompleto(a.banco)) throw new ErrorPago(503, 'El pago por transferencia todavía no está habilitado.');
    const comprobante = leerComprobante(archivo);
    const elegido = await montoElegido(reserva, cuenta, tipoPedido);
    const cotizacion = await cotizacionDolar();
    const datos = {
        reserva: reserva._id,
        usuario: usuario._id,
        metodo: 'transferencia',
        tipo: elegido.tipo,
        estado: 'en_revision',
        montoARS: montoDe(elegido.montoUSD, cotizacion),
        montoUSD: elegido.montoUSD,
        cotizacion,
        comprobante,
        nota: '',
    };
    // Un solo comprobante de transferencia en revisión por reserva: uno nuevo reemplaza al anterior
    const pago = await Pago.findOneAndUpdate({ reserva: reserva._id, metodo: 'transferencia', estado: { $in: ['en_revision', 'rechazado'] } }, { $set: datos }, { new: true, upsert: true });
    await estirarVencimiento(reserva);
    avisarComprobante(reserva, pago);
    return resumenPago(pago);
};

// Mercado Pago: después de pagar, el cliente sube la foto del comprobante. Si Mercado Pago todavía no avisó que
// se acreditó, el pago queda «en revisión» y el panel lo puede confirmar mirando el comprobante.
const subirComprobanteMP = async (pagoId, usuario, archivo) => {
    if (!mongoose.isValidObjectId(pagoId)) throw new ErrorPago(400, 'Pago inválido.');
    const comprobante = leerComprobante(archivo);
    const pago = await Pago.findOne({ _id: pagoId, usuario: usuario._id, metodo: 'mercadopago', estado: { $in: ['pendiente', 'en_revision', 'aprobado'] } });
    if (!pago) throw new ErrorPago(404, 'No encontramos ese pago de Mercado Pago en tu cuenta.');
    pago.comprobante = comprobante;
    if (pago.estado === 'pendiente') pago.estado = 'en_revision';
    await pago.save();
    const reserva = await Reserva.findById(pago.reserva).lean();
    if (reserva) {
        await estirarVencimiento(reserva);
        if (pago.estado !== 'aprobado') avisarComprobante(reserva, pago);
    }
    return resumenPago(pago);
};

// ---------- Panel (Cobros → Pagos de estadías) ----------
const listarAdmin = async () => {
    const pagos = await Pago.find({ estado: { $ne: 'cancelado' } })
        .sort({ createdAt: -1 })
        .limit(300)
        .populate('reserva', 'tituloPropiedad cliente entrada salida noches totalUSD estado')
        .lean();
    return pagos.map((p) => ({
        ...resumenPago(p),
        mpEstado: p.mpEstado,
        mpPago: p.mpPago,
        aprobadoEn: p.aprobadoEn,
        estadia: p.reserva && typeof p.reserva === 'object'
            ? { titulo: p.reserva.tituloPropiedad, cliente: p.reserva.cliente?.nombre || '', email: p.reserva.cliente?.email || '', telefono: p.reserva.cliente?.telefono || '', entrada: p.reserva.entrada, salida: p.reserva.salida, noches: p.reserva.noches, totalUSD: p.reserva.totalUSD, estado: p.reserva.estado }
            : null,
    }));
};

const comprobante = async (id) => {
    if (!mongoose.isValidObjectId(id)) return null;
    const p = await Pago.findById(id).select('+comprobante.datos comprobante').lean();
    return p?.comprobante?.datos ? { datos: Buffer.from(p.comprobante.datos.buffer || p.comprobante.datos), tipo: p.comprobante.tipo, nombre: p.comprobante.nombre } : null;
};

// Confirmar o rechazar un pago con comprobante en revisión (transferencia, o Mercado Pago que todavía no se acreditó solo)
const revisarTransferencia = async (id, aprobar, nota = '') => {
    if (!mongoose.isValidObjectId(id)) throw new ErrorPago(400, 'Pago inválido.');
    const pago = await Pago.findOneAndUpdate(
        { _id: id, estado: 'en_revision' },
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
                    asunto: 'Revisamos tu comprobante de pago',
                    parrafos: [`No pudimos validar el comprobante de tu reserva en ${reserva.tituloPropiedad}.`, pago.nota ? `Motivo: ${pago.nota}` : 'Escribinos y lo vemos juntos.', 'Podés volver a pagar o subir otro comprobante desde Mi cuenta.'],
                    boton: 'Ver mis reservas',
                    enlace: `${config.urlFrontend()}/reservas`,
                })
                .catch((e) => console.error('[pagos] No se pudo avisar el rechazo:', e.message));
        }
    }
    return resumenPago(pago);
};

// Para el número del menú: comprobantes esperando revisión
const contarEnRevision = () => Pago.countDocuments({ estado: 'en_revision' });

module.exports = {
    ErrorPago,
    montoDe,
    opcionesDeMonto,
    aplicarPagoMP,
    verificarMP,
    subirComprobanteMP,
    contarEnRevision,
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
