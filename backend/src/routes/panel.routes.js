const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const Visita = require('../models/visita.model');
const SolicitudPublicacion = require('../models/solicitudPublicacion.model');
const ReservaPropiedad = require('../models/reservaPropiedad.model');
const Pago = require('../models/pago.model');
const agenda = require('../services/agenda.service');
const User = require('../models/user.model');

const router = express.Router();

const DIAS_AVISO_SENA = 3;

// Visitas pendientes de confirmar que todavía no pasaron
const visitasPorConfirmar = async () => {
    const hoy = agenda.ahoraEnArgentina().fecha;
    const visitas = await Visita.find({ estado: 'pendiente' }).select('fecha').lean();
    return visitas.filter((v) => (agenda.fechaIso(v.fecha) || '') >= hoy).length;
};

// Reservas con seña activas que vencen en los próximos días (hay que concretarlas, extenderlas o cancelarlas)
const senasPorVencer = async () => {
    await require('../services/reservasPropiedad.service').vencerReservas();
    return ReservaPropiedad.countDocuments({ estado: 'activa', fechaLimite: { $lte: new Date(Date.now() + DIAS_AVISO_SENA * 86400000) } });
};

const contratosParaRevisar = async () => {
    const { porVencer, actualizan } = await require('../services/recordatorios.service').resumenPanel();
    return porVencer.length + actualizan.length;
};

// Números del menú del panel: lo que la administradora tiene que revisar o confirmar en cada sección.
// Cada cuenta va por su lado: si una falla, esa sección se muestra sin número.
router.get('/pendientes', authMiddleware, authMiddleware.requireAdmin, async (_req, res) => {
    const tareas = {
        visitas: visitasPorConfirmar,
        reservas: async () =>
            (await require('../services/reservas.service').contarPendientes()) + (await Pago.countDocuments({ estado: 'en_revision' })),
        solicitudes: () => require('../services/solicitudes.service').contarPendientes(),
        publicaciones: () => SolicitudPublicacion.countDocuments({ estado: 'pendiente' }),
        senas: senasPorVencer,
        contratos: contratosParaRevisar,
        cobros: () => require('../services/cobros.service').contarAtrasados(),
    };
    const claves = Object.keys(tareas);
    const resultados = await Promise.allSettled(claves.map((c) => tareas[c]()));
    const data = {};
    resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') data[claves[i]] = Number(r.value) || 0;
        else console.error(`[panel] No se pudo contar ${claves[i]}:`, r.reason?.message);
    });
    res.json({ data });
});

// ---------- Resumen para la bienvenida: todo lo pendiente, lo más urgente primero ----------
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const MS_HORA = 3600000;

// urgencia: 1 = hoy / no puede esperar, 2 = esta semana, 3 = cuando puedas
const ordenarPendientes = (items) =>
    items.filter((i) => i && i.cantidad > 0).sort((a, b) => a.urgencia - b.urgencia || (a.orden ?? 50) - (b.orden ?? 50) || b.cantidad - a.cantidad);

const armarResumen = async () => {
    const Reserva = require('../models/reserva.model');
    const Property = require('../models/property.model');
    const reservasService = require('../services/reservas.service');
    const ahora = new Date();
    const hoy = agenda.ahoraEnArgentina().fecha;
    const manana = agenda.sumarDias(hoy, 1);
    const items = [];
    const seguro = async (fn) => {
        try {
            await fn();
        } catch (error) {
            console.error('[panel] Resumen incompleto:', error.message);
        }
    };

    await seguro(async () => {
        const visitas = await Visita.find({ estado: { $in: ['pendiente', 'confirmada', 'reprogramada'] } }).select('fecha horario estado cliente.nombre').lean();
        const conFecha = visitas.map((v) => ({ ...v, dia: agenda.fechaIso(v.fecha) || '', hora: agenda.horaCorta(v.horario) || '' }));
        const deHoy = conFecha.filter((v) => v.dia === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
        if (deHoy.length) {
            items.push({ clave: 'visitas-hoy', urgencia: 1, orden: 0, cantidad: deHoy.length, href: '/admin/visitas', titulo: `Hoy tenés ${plural(deHoy.length, 'visita', 'visitas')}`, detalle: `La primera a las ${deHoy[0].hora} con ${deHoy[0].cliente?.nombre || 'un cliente'}.` });
        }
        const sinConfirmar = conFecha.filter((v) => v.estado === 'pendiente' && v.dia >= hoy);
        const pronto = sinConfirmar.filter((v) => v.dia <= manana);
        items.push({ clave: 'visitas-pronto', urgencia: 1, orden: 1, cantidad: pronto.length, href: '/admin/visitas', titulo: `${plural(pronto.length, 'visita', 'visitas')} para hoy o mañana sin confirmar`, detalle: 'Confirmalas o reprogramalas para que el cliente sepa si va.' });
        const despues = sinConfirmar.length - pronto.length;
        items.push({ clave: 'visitas', urgencia: 2, orden: 10, cantidad: despues, href: '/admin/visitas', titulo: `${plural(despues, 'visita espera', 'visitas esperan')} tu confirmación` });
    });

    await seguro(async () => {
        await reservasService.barrerVencidas();
        const pendientes = await Reserva.find({ estado: 'pendiente' }).select('venceEn').lean();
        const urgentes = pendientes.filter((r) => new Date(r.venceEn).getTime() - ahora.getTime() < 12 * MS_HORA).length;
        items.push({ clave: 'reservas-urgentes', urgencia: 1, orden: 2, cantidad: urgentes, href: '/admin/reservas', titulo: `${plural(urgentes, 'reserva vence', 'reservas vencen')} en menos de 12 horas`, detalle: 'Si no la confirmás, las noches se liberan.' });
        items.push({ clave: 'reservas', urgencia: 2, orden: 11, cantidad: pendientes.length - urgentes, href: '/admin/reservas', titulo: `${plural(pendientes.length - urgentes, 'reserva por confirmar', 'reservas por confirmar')}` });
    });

    await seguro(async () => {
        const n = await Pago.countDocuments({ estado: 'en_revision' });
        items.push({ clave: 'pagos', urgencia: 1, orden: 3, cantidad: n, href: '/admin/reservas', titulo: `${plural(n, 'comprobante de pago', 'comprobantes de pago')} para revisar`, detalle: 'Transferencias que subieron los clientes.' });
    });

    await seguro(async () => {
        await require('../services/reservasPropiedad.service').vencerReservas();
        const activas = await ReservaPropiedad.find({ estado: 'activa', fechaLimite: { $lte: new Date(ahora.getTime() + DIAS_AVISO_SENA * 86400000) } }).select('fechaLimite tituloPropiedad').lean();
        const manianaYa = activas.filter((s) => new Date(s.fechaLimite).getTime() - ahora.getTime() <= 24 * MS_HORA);
        items.push({ clave: 'senas-hoy', urgencia: 1, orden: 4, cantidad: manianaYa.length, href: '/admin/senas', titulo: `${plural(manianaYa.length, 'reserva con seña vence', 'reservas con seña vencen')} en 24 horas`, detalle: manianaYa[0] ? `${manianaYa[0].tituloPropiedad}: concretala, extendela o cancelala.` : undefined });
        items.push({ clave: 'senas', urgencia: 2, orden: 12, cantidad: activas.length - manianaYa.length, href: '/admin/senas', titulo: `${plural(activas.length - manianaYa.length, 'reserva con seña vence', 'reservas con seña vencen')} en los próximos días` });
    });

    await seguro(async () => {
        const n = await require('../services/solicitudes.service').contarPendientes();
        items.push({ clave: 'solicitudes', urgencia: 2, orden: 13, cantidad: n, href: '/admin/solicitudes', titulo: `${plural(n, 'solicitud de alquiler o compra', 'solicitudes de alquiler o compra')} para revisar` });
    });

    await seguro(async () => {
        const n = await SolicitudPublicacion.countDocuments({ estado: 'pendiente' });
        items.push({ clave: 'publicaciones', urgencia: 2, orden: 14, cantidad: n, href: '/admin/publicaciones', titulo: `${plural(n, 'pedido de publicación', 'pedidos de publicación')} para revisar` });
    });

    await seguro(async () => {
        const { porVencer, actualizan } = await require('../services/recordatorios.service').resumenPanel();
        const pronto = porVencer.filter((c) => c.dias <= 15);
        items.push({ clave: 'contratos-pronto', urgencia: 1, orden: 5, cantidad: pronto.length, href: '/admin/contratos', titulo: `${plural(pronto.length, 'contrato vence', 'contratos vencen')} en 15 días o menos`, detalle: pronto[0] ? `${pronto[0].propiedad} · ${pronto[0].cliente} (en ${pronto[0].dias} días).` : undefined });
        items.push({ clave: 'contratos', urgencia: 2, orden: 15, cantidad: porVencer.length - pronto.length, href: '/admin/contratos', titulo: `${plural(porVencer.length - pronto.length, 'contrato vence', 'contratos vencen')} en los próximos 2 meses` });
        items.push({ clave: 'contratos-indice', urgencia: 2, orden: 16, cantidad: actualizan.length, href: '/admin/cobros', titulo: `${plural(actualizan.length, 'contrato actualiza', 'contratos actualizan')} el precio este mes` });
    });

    await seguro(async () => {
        const n = await require('../services/cobros.service').contarAtrasados();
        items.push({ clave: 'cobros', urgencia: 2, orden: 17, cantidad: n, href: '/admin/cobros', titulo: `${plural(n, 'alquiler atrasado', 'alquileres atrasados')} este mes`, detalle: 'Registrá el pago o mandale el aviso al inquilino.' });
    });

    await seguro(async () => {
        const props = await Property.find({ estado: { $nin: ['vendido', 'alquilado'] } }).select('images latitud longitud').lean();
        const sinFotos = props.filter((p) => !p.images?.length).length;
        const sinUbicacion = props.filter((p) => !p.latitud || !p.longitud).length;
        items.push({ clave: 'sin-fotos', urgencia: 3, orden: 20, cantidad: sinFotos, href: '/admin/propiedades', titulo: `${plural(sinFotos, 'propiedad sin fotos', 'propiedades sin fotos')}` });
        items.push({ clave: 'sin-ubicacion', urgencia: 3, orden: 21, cantidad: sinUbicacion, href: '/admin/propiedades', titulo: `${plural(sinUbicacion, 'propiedad sin ubicación', 'propiedades sin ubicación')} en el mapa` });
    });

    await seguro(async () => {
        const a = await require('../services/ajustes.service').leer();
        const faltan = [!a.lugares?.length && 'los lugares de referencia', !a.costos?.publicado && 'la calculadora de costos', !require('../services/ajustes.service').bancoCompleto(a.banco) && 'los datos para transferencias'].filter(Boolean);
        items.push({ clave: 'ajustes', urgencia: 3, orden: 22, cantidad: faltan.length, href: '/admin/sitio', titulo: 'Completá los datos del sitio', detalle: `Falta: ${faltan.join(', ')}.` });
    });

    return ordenarPendientes(items).map(({ orden, ...item }) => item);
};

router.get('/resumen', authMiddleware, authMiddleware.requireAdmin, async (_req, res) => {
    try {
        res.json({ data: await armarResumen() });
    } catch (error) {
        console.error('[panel] Error al armar el resumen:', error);
        res.status(500).json({ message: 'No se pudo armar el resumen' });
    }
});

// Accesos rápidos del inicio: lista de claves cortas (las conoce el frontend). Se limpian repetidos y basura.
const MAX_ACCESOS = 12;
const limpiarAccesos = (lista) => {
    if (!Array.isArray(lista)) return null;
    const vistos = new Set();
    for (const clave of lista) {
        if (typeof clave === 'string' && /^[a-z0-9-]{1,40}$/.test(clave)) vistos.add(clave);
        if (vistos.size >= MAX_ACCESOS) break;
    }
    return [...vistos];
};

router.get('/accesos', authMiddleware, authMiddleware.requireAdmin, (req, res) => {
    const accesos = req.user.preferencias?.accesos;
    res.status(200).json({ data: Array.isArray(accesos) ? accesos : null });
});

router.put('/accesos', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
    const accesos = limpiarAccesos(req.body?.accesos);
    if (!accesos) return res.status(400).json({ message: 'Los accesos rápidos no son válidos' });
    try {
        await User.updateOne({ _id: req.user._id }, { $set: { 'preferencias.accesos': accesos, updatedAt: Date.now() } });
        res.status(200).json({ data: accesos });
    } catch {
        res.status(500).json({ message: 'No se pudieron guardar los accesos rápidos' });
    }
});

module.exports = router;
module.exports.ordenarPendientes = ordenarPendientes;
module.exports.limpiarAccesos = limpiarAccesos;
