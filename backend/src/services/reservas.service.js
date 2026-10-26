// Reservas de estadías en alquiler temporario (HU-20).
// Una reserva pendiente retiene sus noches en Disponibilidad (tipo reserva) hasta que el administrador la
// confirma (pasan a ocupada), la rechaza o vence (se liberan). No hay cron: cada pendiente guarda su vencimiento,
// las consultas ignoran las vencidas y un barrido liviano las marca cuando alguien mira el panel o el calendario.
// Las reglas (vencimiento, total, validación del pedido) son funciones puras y se prueban sin base de datos.

const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const Disponibilidad = require('../models/disponibilidad.model');
const ApiError = require('../utils/api-error');
const { ahoraEnArgentina, sumarDias } = require('./agenda.service');
const {
    DIAS_PUBLICOS,
    validarRango,
    nochesEntre,
    seSolapan,
    filtroVigente,
    buscarChoque,
    conCandado,
    propiedadTemporaria,
} = require('./disponibilidad.service');

// Plazo para confirmar una reserva, en horas (RESERVA_PLAZO_HORAS en el .env; 48 si no está)
const plazoHoras = () => {
    const valor = Number(process.env.RESERVA_PLAZO_HORAS);
    return Number.isFinite(valor) && valor > 0 ? valor : 48;
};
// Si la entrada llega antes, el plazo termina ese día a esta hora (Argentina no cambia de hora: UTC-3 todo el año)
const HORA_LIMITE_ENTRADA = '12:00';
const HUSO_ARGENTINA = '-03:00';
// Un cliente no puede retener más de estas reservas a la vez (evita que alguien trabe el calendario entero)
const PENDIENTES_POR_CLIENTE = 3;

const HORA = 3600000;

// 48 horas desde el envío, o las 12:00 del día de entrada si eso ocurre antes
const calcularVencimiento = (entrada, ahora = new Date(), horas = plazoHoras()) => {
    const porPlazo = ahora.getTime() + horas * HORA;
    const mediodiaEntrada = Date.parse(`${entrada}T${HORA_LIMITE_ENTRADA}:00${HUSO_ARGENTINA}`);
    return new Date(Math.min(porPlazo, mediodiaEntrada));
};

const redondear = (n) => Math.round(n * 100) / 100;

// Noches × precio por noche, más la limpieza (una sola vez, solo si tiene costo)
const calcularTotal = ({ noches, precioPorNocheUSD, costoLimpiezaUSD }) => {
    const alojamientoUSD = redondear(noches * precioPorNocheUSD);
    const limpiezaUSD = costoLimpiezaUSD > 0 ? redondear(costoLimpiezaUSD) : 0;
    return { alojamientoUSD, limpiezaUSD, totalUSD: redondear(alojamientoUSD + limpiezaUSD) };
};

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
// "2026-11-12" → "12/11"
const diaMes = (iso) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;

// Devuelve el motivo por el que el pedido no se puede hacer, o null si está bien
const validarPedido = ({ entrada, salida, huespedes }, propiedad, hoy) => {
    const errorRango = validarRango({ desde: entrada, hasta: salida });
    if (errorRango) return errorRango;
    // Desde mañana: con entrada hoy el plazo de las 12:00 ya pasó o no le da tiempo al administrador
    if (entrada <= hoy) return 'La entrada tiene que ser desde mañana.';
    if (salida > sumarDias(hoy, DIAS_PUBLICOS)) return 'Por ahora se puede reservar hasta un año adelante.';
    if (!(propiedad.precioPorNocheUSD > 0)) return 'Esta propiedad todavía no tiene precio por noche. Escribinos por WhatsApp para reservarla.';
    const minimo = Math.max(1, propiedad.minimoNoches || 1);
    if (nochesEntre(entrada, salida) < minimo) return `La estadía mínima es de ${plural(minimo, 'noche', 'noches')}.`;
    if (!Number.isInteger(huespedes) || huespedes < 1) return 'Indicá cuántos huéspedes van a ser.';
    if (propiedad.huespedesMaximos > 0 && huespedes > propiedad.huespedesMaximos) {
        return `Esta propiedad admite hasta ${plural(propiedad.huespedesMaximos, 'huésped', 'huéspedes')}.`;
    }
    return null;
};

const idValido = (id, que = 'de la reserva') => {
    if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`El id ${que} no es válido`);
};

// Marca como vencidas las pendientes cuyo plazo pasó y libera sus noches. Cada una se cambia con un update
// condicionado a que siga pendiente: si justo la confirman o la rechazan, el barrido no la toca.
const barrerVencidas = async ({ propiedad = null, session = null, ahora = new Date() } = {}) => {
    if (propiedad && !mongoose.isValidObjectId(propiedad)) return 0;
    const filtro = { estado: 'pendiente', venceEn: { $lte: ahora } };
    if (propiedad) filtro.propiedad = propiedad;
    const candidatas = await Reserva.find(filtro).select('_id venceEn').session(session).lean();

    let vencidas = 0;
    for (const { _id, venceEn } of candidatas) {
        const cambio = await Reserva.updateOne(
            { _id, estado: 'pendiente' },
            {
                $set: { estado: 'vencida' },
                $push: { historial: { estado: 'vencida', fecha: venceEn, por: 'sistema', nota: 'Venció el plazo sin confirmación' } },
            },
            { session }
        );
        if (cambio.modifiedCount) {
            await Disponibilidad.deleteMany({ reserva: _id, tipo: 'reserva' }, { session });
            vencidas += 1;
        }
    }
    return vencidas;
};

const crearReserva = async ({ usuario, propiedad: propiedadId, entrada, salida, huespedes }) => {
    const propiedad = await propiedadTemporaria(propiedadId);
    const cantidad = Number(huespedes);
    const hoy = ahoraEnArgentina().fecha;
    const error = validarPedido({ entrada, salida, huespedes: cantidad }, propiedad, hoy);
    if (error) throw ApiError.badRequest(error);

    const ahora = new Date();
    const noches = nochesEntre(entrada, salida);
    const { limpiezaUSD, totalUSD } = calcularTotal({ noches, ...propiedad });
    const venceEn = calcularVencimiento(entrada, ahora);
    const nombre = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email;

    return conCandado(propiedadId, async (session) => {
        // Las vencidas de esta propiedad se limpian dentro de la misma transacción
        await barrerVencidas({ propiedad: propiedadId, session, ahora });

        const retenidas = await Reserva.countDocuments({ 'cliente.usuario': usuario._id, estado: 'pendiente', venceEn: { $gt: ahora } }).session(session);
        if (retenidas >= PENDIENTES_POR_CLIENTE) {
            throw new ApiError(409, `Ya tenés ${PENDIENTES_POR_CLIENTE} reservas esperando confirmación. Esperá la respuesta o cancelá alguna desde Mi cuenta.`);
        }

        const choque = await buscarChoque(propiedadId, entrada, salida, { session, ahora });
        if (choque) {
            const desde = choque.desde > entrada ? choque.desde : entrada;
            const hasta = choque.hasta < salida ? choque.hasta : salida;
            throw new ApiError(409, `Las noches del ${diaMes(desde)} al ${diaMes(hasta)} ya no están libres. Elegí otras fechas, por favor.`);
        }

        const [reserva] = await Reserva.create(
            [
                {
                    propiedad: propiedadId,
                    tituloPropiedad: propiedad.title,
                    cliente: { usuario: usuario._id, nombre, email: usuario.email, telefono: usuario.telefono || '' },
                    entrada,
                    salida,
                    noches,
                    huespedes: cantidad,
                    precioPorNocheUSD: propiedad.precioPorNocheUSD,
                    limpiezaUSD,
                    totalUSD,
                    venceEn,
                    historial: [{ estado: 'pendiente', fecha: ahora, por: 'cliente', nota: '' }],
                },
            ],
            { session }
        );
        await Disponibilidad.create(
            [{ propiedad: propiedadId, desde: entrada, hasta: salida, tipo: 'reserva', reserva: reserva._id, venceEn, motivo: `Reserva de ${nombre}` }],
            { session }
        );
        return reserva;
    });
};

// Confirma una pendiente. Si ya venció (o venció y el barrido la marcó), se reactiva solo si las noches siguen libres.
const confirmar = async (id) => {
    idValido(id);
    const previa = await Reserva.findById(id).select('propiedad').lean();
    if (!previa) throw ApiError.notFound('Reserva no encontrada');

    return conCandado(previa.propiedad, async (session) => {
        const ahora = new Date();
        const reserva = await Reserva.findById(id).session(session);
        if (reserva.estado === 'confirmada') throw new ApiError(409, 'Esta reserva ya estaba confirmada.');
        if (!['pendiente', 'vencida'].includes(reserva.estado)) throw new ApiError(409, `No se puede confirmar una reserva ${reserva.estado}.`);
        if (reserva.salida <= ahoraEnArgentina().fecha) throw new ApiError(409, 'La estadía ya terminó: no se puede confirmar.');

        const fueraDePlazo = reserva.estado === 'vencida' || reserva.venceEn <= ahora;
        const choque = await buscarChoque(reserva.propiedad, reserva.entrada, reserva.salida, { session, ahora, excluirReserva: reserva._id });
        if (choque) {
            throw new ApiError(
                409,
                fueraDePlazo
                    ? `Venció el plazo y esas noches ya se tomaron (del ${diaMes(choque.desde)} al ${diaMes(choque.hasta)}). No se puede confirmar.`
                    : `Se pisa con otro rango cargado (del ${diaMes(choque.desde)} al ${diaMes(choque.hasta)}). Revisalo en Disponibilidad.`
            );
        }

        // La retención (si quedó) se reemplaza por una ocupada sin vencimiento
        await Disponibilidad.deleteMany({ reserva: reserva._id }, { session });
        await Disponibilidad.create(
            [{ propiedad: reserva.propiedad, desde: reserva.entrada, hasta: reserva.salida, tipo: 'ocupada', reserva: reserva._id, motivo: `Reserva de ${reserva.cliente.nombre}` }],
            { session }
        );
        reserva.estado = 'confirmada';
        reserva.historial.push({
            estado: 'confirmada',
            fecha: ahora,
            por: 'admin',
            nota: fueraDePlazo ? 'Confirmada fuera de plazo: las noches seguían libres' : '',
        });
        await reserva.save({ session });
        return reserva;
    });
};

// Libera las noches de una reserva que deja de valer (rechazada o cancelada)
const cerrarPendiente = async (filtro, estado, por, nota) => {
    const ahora = new Date();
    const reserva = await Reserva.findOneAndUpdate(
        { ...filtro, estado: 'pendiente' },
        {
            $set: { estado, ...(estado === 'rechazada' ? { motivoRechazo: nota } : {}) },
            $push: { historial: { estado, fecha: ahora, por, nota } },
        },
        { returnDocument: 'after' }
    );
    if (reserva) await Disponibilidad.deleteMany({ reserva: reserva._id, tipo: 'reserva' });
    return reserva;
};

const limpiarNota = (texto) => (typeof texto === 'string' ? texto.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300) : '');

const rechazar = async (id, motivo) => {
    idValido(id);
    const reserva = await cerrarPendiente({ _id: id }, 'rechazada', 'admin', limpiarNota(motivo));
    if (reserva) return reserva;
    const actual = await Reserva.findById(id).select('estado').lean();
    if (!actual) throw ApiError.notFound('Reserva no encontrada');
    throw new ApiError(409, `Solo se pueden rechazar reservas pendientes (esta está ${actual.estado}).`);
};

// El cliente cancela una reserva suya que todavía no se confirmó
const cancelar = async (id, usuarioId) => {
    idValido(id);
    const reserva = await cerrarPendiente({ _id: id, 'cliente.usuario': usuarioId }, 'cancelada', 'cliente', 'Cancelada por el cliente');
    if (reserva) return reserva;
    const actual = await Reserva.findOne({ _id: id, 'cliente.usuario': usuarioId }).select('estado').lean();
    if (!actual) throw ApiError.notFound('Reserva no encontrada');
    throw new ApiError(409, 'Solo podés cancelar una reserva mientras espera confirmación. Para cambiar una confirmada, escribinos.');
};

// Para el panel: con `sePuedeReactivar` en las vencidas cuya estadía no pasó (las noches siguen libres o no)
const listar = async ({ estado } = {}) => {
    await barrerVencidas();
    const filtro = {};
    if (typeof estado === 'string' && Reserva.ESTADOS_RESERVA.includes(estado)) filtro.estado = estado;
    const reservas = (await Reserva.find(filtro).sort({ createdAt: -1 }).limit(300)).map((r) => r.toJSON());

    const hoy = ahoraEnArgentina().fecha;
    const vencidas = reservas.filter((r) => r.estado === 'vencida' && r.salida > hoy);
    if (vencidas.length) {
        const rangos = await Disponibilidad.find({
            propiedad: { $in: [...new Set(vencidas.map((r) => String(r.propiedad)))] },
            hasta: { $gt: hoy },
            ...filtroVigente(),
        })
            .select('propiedad desde hasta reserva')
            .lean();
        vencidas.forEach((r) => {
            r.sePuedeReactivar = !rangos.some(
                (otro) => String(otro.propiedad) === String(r.propiedad) && String(otro.reserva) !== r.id && seSolapan({ desde: r.entrada, hasta: r.salida }, otro)
            );
        });
    }
    return reservas;
};

const contarPendientes = async () => {
    await barrerVencidas();
    return Reserva.countDocuments({ estado: 'pendiente' });
};

// Mi cuenta: las reservas del cliente, con la foto y el título actuales de la propiedad
const mias = async (usuarioId) => {
    await barrerVencidas();
    return Reserva.find({ 'cliente.usuario': usuarioId })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('-cliente')
        .populate('propiedad', 'title images ciudad location');
};

module.exports = {
    plazoHoras,
    calcularVencimiento,
    calcularTotal,
    validarPedido,
    barrerVencidas,
    crearReserva,
    confirmar,
    rechazar,
    cancelar,
    listar,
    contarPendientes,
    mias,
};
