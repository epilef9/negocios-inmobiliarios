// HU-13 / RF-11: reservas con seña de propiedades en venta o alquiler (no temporario: esas usan reservas.service).
const mongoose = require('mongoose');
const ReservaPropiedad = require('../models/reservaPropiedad.model');
const Property = require('../models/property.model');

const DIAS_MAXIMOS = 180;
const MS_DIA = 24 * 60 * 60 * 1000;

// Una reserva activa vence cuando pasa su fecha límite
const estaVencida = (reserva, ahora = new Date()) => reserva.estado === 'activa' && new Date(reserva.fechaLimite).getTime() < ahora.getTime();

// Revisa y arma los datos de una reserva nueva. Devuelve { datos } o { error }.
const revisarDatos = (cuerpo = {}, ahora = new Date()) => {
    const texto = (v, max) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
    const nombre = texto(cuerpo.cliente?.nombre, 120);
    const email = texto(cuerpo.cliente?.email, 150).toLowerCase();
    const telefono = texto(cuerpo.cliente?.telefono, 40);
    const monto = Number(cuerpo.sena?.monto);
    const moneda = cuerpo.sena?.moneda === 'ARS' ? 'ARS' : 'USD';
    const limite = new Date(cuerpo.fechaLimite);

    if (!mongoose.isValidObjectId(cuerpo.propiedad)) return { error: 'Elegí la propiedad a reservar.' };
    if (!nombre) return { error: 'Escribí el nombre de quien reserva.' };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no es válido.' };
    if (!email && telefono.replace(/\D/g, '').length < 6) return { error: 'Cargá un email o un teléfono para contactar a quien reserva.' };
    if (!Number.isFinite(monto) || monto <= 0) return { error: 'El monto de la seña tiene que ser mayor a cero.' };
    if (Number.isNaN(limite.getTime())) return { error: 'La fecha límite no es válida.' };
    if (limite.getTime() <= ahora.getTime()) return { error: 'La fecha límite tiene que ser futura.' };
    if (limite.getTime() > ahora.getTime() + DIAS_MAXIMOS * MS_DIA) return { error: `La reserva puede durar como mucho ${DIAS_MAXIMOS} días.` };

    return {
        datos: {
            propiedad: cuerpo.propiedad,
            cliente: { nombre, email, telefono, usuario: mongoose.isValidObjectId(cuerpo.cliente?.usuario) ? cuerpo.cliente.usuario : null },
            sena: { monto, moneda, recibidaEl: ahora },
            fechaLimite: limite,
            notas: typeof cuerpo.notas === 'string' ? cuerpo.notas.trim().slice(0, 1000) : '',
        },
    };
};

// Devuelve la propiedad a «Disponible» solo si sigue reservada (no pisa un cambio que hizo el administrador)
const liberarPropiedad = async (propiedadId) => {
    const { modifiedCount } = await Property.updateOne({ _id: propiedadId, estado: 'reservado' }, { $set: { estado: 'disponible' }, $unset: { reservadaHasta: 1 } });
    // Quienes esperaban esta propiedad reciben el aviso de que se liberó
    if (modifiedCount) require('./avisos.service').propiedadDisponible(propiedadId);
    return modifiedCount;
};

// Pasa a «vencida» las activas cuya fecha límite ya pasó y libera sus propiedades. Barato: usa el índice.
const vencerReservas = async (ahora = new Date()) => {
    const vencidas = await ReservaPropiedad.find({ estado: 'activa', fechaLimite: { $lt: ahora } }).select('_id propiedad').lean();
    for (const r of vencidas) {
        const { modifiedCount } = await ReservaPropiedad.updateOne({ _id: r._id, estado: 'activa' }, { $set: { estado: 'vencida', cerradaEl: ahora } });
        if (modifiedCount) await liberarPropiedad(r.propiedad);
    }
    return vencidas.length;
};

const listar = async ({ estado, propiedad } = {}) => {
    await vencerReservas();
    const filtro = {};
    if (['activa', 'concretada', 'cancelada', 'vencida'].includes(estado)) filtro.estado = estado;
    if (mongoose.isValidObjectId(propiedad)) filtro.propiedad = propiedad;
    return ReservaPropiedad.find(filtro).sort({ estado: 1, fechaLimite: 1, createdAt: -1 }).populate('propiedad', 'title images estado categoria_operacion price moneda').lean();
};

// Crea la reserva y marca la propiedad. La propiedad se toma con una actualización condicional (solo si está
// disponible), así dos reservas al mismo tiempo no pueden quedarse con la misma.
const crear = async (cuerpo) => {
    await vencerReservas();
    const { datos, error } = revisarDatos(cuerpo);
    if (error) return { status: 400, error };

    const propiedad = await Property.findById(datos.propiedad).select('title estado categoria_operacion').lean();
    if (!propiedad) return { status: 404, error: 'La propiedad no existe.' };
    if (propiedad.categoria_operacion === 'temporario') {
        return { status: 400, error: 'Los alquileres temporarios se reservan por noches desde Reservas.' };
    }
    const operacion = propiedad.categoria_operacion === 'alquiler' ? 'alquiler' : 'venta';

    const tomada = await Property.findOneAndUpdate(
        { _id: datos.propiedad, estado: { $in: ['disponible', null] } },
        { $set: { estado: 'reservado', reservadaHasta: datos.fechaLimite } },
        { new: true }
    );
    if (!tomada) return { status: 409, error: 'La propiedad no está disponible: ya está reservada, alquilada o vendida.' };

    try {
        const reserva = await ReservaPropiedad.create({ ...datos, operacion, tituloPropiedad: propiedad.title });
        return { reserva };
    } catch (e) {
        await liberarPropiedad(datos.propiedad);
        throw e;
    }
};

// Cierra una reserva activa: concretada (la propiedad pasa a vendida o alquilada) o cancelada (vuelve a disponible)
const cerrar = async (id, estado, cierre = '') => {
    if (!mongoose.isValidObjectId(id)) return { status: 400, error: 'Reserva inválida.' };
    await vencerReservas();
    const reserva = await ReservaPropiedad.findOneAndUpdate(
        { _id: id, estado: 'activa' },
        { $set: { estado, cierre: String(cierre || '').trim().slice(0, 500), cerradaEl: new Date() } },
        { new: true }
    );
    if (!reserva) return { status: 409, error: 'La reserva ya no está activa.' };
    if (estado === 'concretada') {
        await Property.updateOne(
            { _id: reserva.propiedad },
            { $set: { estado: reserva.operacion === 'alquiler' ? 'alquilado' : 'vendido' }, $unset: { reservadaHasta: 1 } }
        );
    } else {
        await liberarPropiedad(reserva.propiedad);
    }
    return { reserva };
};

// Cambia la fecha límite de una reserva activa
const extender = async (id, fechaLimite) => {
    if (!mongoose.isValidObjectId(id)) return { status: 400, error: 'Reserva inválida.' };
    const limite = new Date(fechaLimite);
    const ahora = new Date();
    if (Number.isNaN(limite.getTime()) || limite <= ahora) return { status: 400, error: 'La nueva fecha límite tiene que ser futura.' };
    if (limite.getTime() > ahora.getTime() + DIAS_MAXIMOS * MS_DIA) return { status: 400, error: `La reserva puede durar como mucho ${DIAS_MAXIMOS} días.` };
    await vencerReservas();
    const reserva = await ReservaPropiedad.findOneAndUpdate({ _id: id, estado: 'activa' }, { $set: { fechaLimite: limite } }, { new: true });
    if (!reserva) return { status: 409, error: 'La reserva ya no está activa.' };
    await Property.updateOne({ _id: reserva.propiedad, estado: 'reservado' }, { $set: { reservadaHasta: limite } });
    return { reserva };
};

// El administrador cambió el estado desde el listado: vendida/alquilada concreta la reserva, disponible la cancela
const cerrarPorCambioDeEstado = async (propiedadId, estado) => {
    const nuevo = estado === 'vendido' || estado === 'alquilado' ? 'concretada' : 'cancelada';
    await ReservaPropiedad.updateMany(
        { propiedad: propiedadId, estado: 'activa' },
        { $set: { estado: nuevo, cierre: 'Se cambió el estado de la propiedad desde el panel.', cerradaEl: new Date() } }
    );
    await Property.updateOne({ _id: propiedadId }, { $unset: { reservadaHasta: 1 } });
};

module.exports = { cerrarPorCambioDeEstado, estaVencida, revisarDatos, vencerReservas, listar, crear, cerrar, extender, DIAS_MAXIMOS };
