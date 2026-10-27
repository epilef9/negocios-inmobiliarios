// Avisos por mail a clientes:
//  - disponibilidad (113/219): una propiedad alquilada/reservada vuelve a estar disponible
//  - búsqueda guardada (221): se publica (o se libera) una propiedad que coincide con sus filtros
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Aviso = require('../models/aviso.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const emailService = require('./email.service');
const config = require('../config/env');

const MAXIMO_AVISOS_POR_USUARIO = 30;
const MAXIMO_MAILS_BUSQUEDA_POR_DIA = 3;

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const normalizar = (t = '') => String(t).toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const tipoGeneral = (t = '') => (t === 'monoambiente' ? 'departamento' : t);

// Mismos criterios que los filtros del catálogo
const cumpleBusqueda = (p, f = {}) => {
    const ambientes = p.cantidad_ambientes ?? p.bedrooms;
    return (
        (!f.operacion || p.categoria_operacion === f.operacion) &&
        (!f.localidad || normalizar(p.ciudad) === normalizar(f.localidad)) &&
        (!f.tipo || tipoGeneral(p.tipo_inmueble) === f.tipo) &&
        (f.precioMin == null || p.price >= f.precioMin) &&
        (f.precioMax == null || p.price <= f.precioMax) &&
        (f.ambientes == null || (ambientes != null && ambientes >= f.ambientes)) &&
        (!f.comodidad || (p.comodidades || []).includes(f.comodidad))
    );
};

// Filtros del catálogo (los nombres del frontend) → los del aviso, solo valores válidos
const limpiarFiltros = (f = {}) => {
    const texto = (v, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const numero = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
    return {
        operacion: ['venta', 'alquiler', 'temporario'].includes(f.operation) ? f.operation : '',
        localidad: texto(f.location, 80),
        tipo: ['casa', 'departamento', 'local', 'terreno'].includes(f.propertyType) ? f.propertyType : '',
        precioMin: numero(f.minPrice),
        precioMax: numero(f.maxPrice),
        ambientes: numero(f.rooms),
        comodidad: /^[a-z_]{2,30}$/.test(f.amenities || '') ? f.amenities : '',
    };
};

const describirBusqueda = (f) =>
    [
        { venta: 'Compra', alquiler: 'Alquiler', temporario: 'Alquiler por días' }[f.operacion] || 'Cualquier operación',
        f.tipo ? { casa: 'casa', departamento: 'departamento', local: 'local', terreno: 'terreno' }[f.tipo] : '',
        f.localidad ? `en ${f.localidad}` : '',
        f.ambientes ? `${f.ambientes}+ ambientes` : '',
        f.precioMin != null ? `desde USD ${f.precioMin.toLocaleString('es-AR')}` : '',
        f.precioMax != null ? `hasta USD ${f.precioMax.toLocaleString('es-AR')}` : '',
    ]
        .filter(Boolean)
        .join(' · ');

// ---------- Lo que hace el cliente ----------
const mios = (usuario) => Aviso.find({ usuario, activo: true }).sort({ createdAt: -1 }).populate('propiedad', 'title images estado ciudad categoria_operacion').lean();

const crear = async (usuario, cuerpo = {}) => {
    if ((await Aviso.countDocuments({ usuario, activo: true })) >= MAXIMO_AVISOS_POR_USUARIO) {
        return { status: 409, error: `Podés tener hasta ${MAXIMO_AVISOS_POR_USUARIO} avisos activos. Quitá alguno desde Mi cuenta.` };
    }
    const tokenBaja = crypto.randomBytes(24).toString('hex');
    if (cuerpo.tipo === 'disponibilidad') {
        if (!mongoose.isValidObjectId(cuerpo.propiedad)) return { status: 400, error: 'Propiedad inválida.' };
        const p = await Property.findById(cuerpo.propiedad).select('estado').lean();
        if (!p) return { status: 404, error: 'La propiedad no existe.' };
        if (!p.estado || p.estado === 'disponible') return { status: 409, error: 'Esta propiedad ya está disponible.' };
        const existente = await Aviso.findOne({ usuario, tipo: 'disponibilidad', propiedad: cuerpo.propiedad, activo: true }).lean();
        if (existente) return { aviso: existente };
        return { status: 201, aviso: await Aviso.create({ usuario, tipo: 'disponibilidad', propiedad: cuerpo.propiedad, tokenBaja }) };
    }
    if (cuerpo.tipo === 'busqueda') {
        const filtros = limpiarFiltros(cuerpo.filtros);
        if (!Object.values(filtros).some((v) => v !== '' && v !== null)) return { status: 400, error: 'Elegí al menos un filtro para guardar la búsqueda.' };
        return { status: 201, aviso: await Aviso.create({ usuario, tipo: 'busqueda', filtros, tokenBaja }) };
    }
    return { status: 400, error: 'Tipo de aviso inválido.' };
};

const quitar = async (usuario, id) => {
    if (!mongoose.isValidObjectId(id)) return false;
    const { modifiedCount } = await Aviso.updateOne({ _id: id, usuario, activo: true }, { $set: { activo: false } });
    return modifiedCount > 0;
};

const bajaPorToken = async (token) => {
    if (typeof token !== 'string' || !/^[\da-f]{48}$/.test(token)) return null;
    return Aviso.findOneAndUpdate({ tokenBaja: token }, { $set: { activo: false } }, { new: true }).lean();
};

// ---------- Envíos ----------
const linkBaja = (a) => `${config.urlFrontend()}/avisos/baja?token=${a.tokenBaja}`;
const linkFicha = (p) => `${config.urlFrontend()}/propiedades/${p._id}`;

// Una propiedad volvió a estar disponible: avisa a quienes la esperaban (un solo mail por aviso) y a las búsquedas
const propiedadDisponible = async (propiedadId) => {
    try {
        const p = await Property.findById(propiedadId).lean();
        if (!p || (p.estado && p.estado !== 'disponible')) return;
        const avisos = await Aviso.find({ tipo: 'disponibilidad', propiedad: propiedadId, activo: true }).lean();
        for (const a of avisos) {
            const { modifiedCount } = await Aviso.updateOne({ _id: a._id, activo: true }, { $set: { activo: false, avisadoEn: new Date() } });
            if (!modifiedCount) continue;
            const user = await User.findById(a.usuario).select('email nombre').lean();
            if (!user?.email) continue;
            await emailService
                .avisarCliente({
                    para: user.email,
                    nombre: user.nombre,
                    asunto: `«${p.title}» ya está disponible`,
                    parrafos: [`La propiedad que estabas esperando volvió a estar disponible: ${p.title}${p.ciudad ? `, en ${p.ciudad}` : ''}.`, 'Si te interesa, escribinos o pedí una visita cuanto antes.'],
                    boton: 'Ver la propiedad',
                    enlace: linkFicha(p),
                    pie: `Este aviso ya se cumplió y no te vamos a escribir de nuevo por esta propiedad.`,
                })
                .catch((e) => console.error('[avisos] No se pudo avisar disponibilidad:', e.message));
        }
        await coincidenciasDeBusqueda(p);
    } catch (error) {
        console.error('[avisos] Error al avisar disponibilidad:', error.message);
    }
};

// Propiedad nueva o liberada: avisa a las búsquedas guardadas que coinciden (con tope de mails por día)
const coincidenciasDeBusqueda = async (p) => {
    try {
        if (!p || (p.estado && p.estado !== 'disponible')) return;
        const busquedas = await Aviso.find({ tipo: 'busqueda', activo: true, ultimasAvisadas: { $ne: p._id } }).lean();
        const dia = hoy();
        for (const a of busquedas.filter((b) => cumpleBusqueda(p, b.filtros))) {
            const enviosHoy = a.diaEnvios === dia ? a.enviosDelDia : 0;
            if (enviosHoy >= MAXIMO_MAILS_BUSQUEDA_POR_DIA) continue;
            await Aviso.updateOne(
                { _id: a._id },
                { $set: { diaEnvios: dia, enviosDelDia: enviosHoy + 1, avisadoEn: new Date() }, $push: { ultimasAvisadas: { $each: [p._id], $slice: -50 } } }
            );
            const user = await User.findById(a.usuario).select('email nombre').lean();
            if (!user?.email) continue;
            await emailService
                .avisarCliente({
                    para: user.email,
                    nombre: user.nombre,
                    asunto: `Entró una propiedad como la que buscás: ${p.title}`,
                    parrafos: [`Coincide con tu búsqueda guardada (${describirBusqueda(a.filtros)}):`, `${p.title}${p.ciudad ? ` · ${p.ciudad}` : ''}`],
                    boton: 'Ver la propiedad',
                    enlace: linkFicha(p),
                    pie: `¿No querés más avisos de esta búsqueda? Date de baja acá: ${linkBaja(a)}`,
                })
                .catch((e) => console.error('[avisos] No se pudo avisar la búsqueda:', e.message));
        }
    } catch (error) {
        console.error('[avisos] Error al revisar búsquedas guardadas:', error.message);
    }
};

module.exports = { cumpleBusqueda, limpiarFiltros, describirBusqueda, mios, crear, quitar, bajaPorToken, propiedadDisponible, coincidenciasDeBusqueda };
