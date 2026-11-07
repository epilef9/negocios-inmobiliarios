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
const { operacionesDe, precioDe } = require('../utils/operaciones');

const MAXIMO_AVISOS_POR_USUARIO = 30;
const MAXIMO_MAILS_BUSQUEDA_POR_DIA = 3;

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const normalizar = (t = '') => String(t).toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const tipoGeneral = (t = '') => (t === 'monoambiente' ? 'departamento' : t);

// Operación, localidad, tipo y comodidades pueden traer varias opciones separadas por coma («casa,departamento»)
const separar = (valor) => (typeof valor === 'string' ? valor.split(',').map((v) => v.trim()).filter(Boolean) : []);
const listaComodidades = (valor) => separar(valor).filter((c) => /^[a-z_]{2,30}$/.test(c));
const OPERACIONES = ['venta', 'alquiler', 'temporario'];
const TIPOS = ['casa', 'departamento', 'local', 'terreno'];
const sinRepetir = (lista, maximo) => [...new Set(lista)].slice(0, maximo).join(',');

// Mismos criterios que los filtros del catálogo. Con venta y alquiler (HU-25), el precio que cuenta es el de la
// operación buscada; sin operación, alcanza con que alguna de las dos entre en el rango.
// En operación, localidad y tipo alcanza con una de las opciones; las comodidades tienen que estar todas.
const cumpleBusqueda = (p, f = {}) => {
    const ambientes = p.ambientes ?? p.dormitorios;
    const operaciones = operacionesDe(p);
    const buscadas = separar(f.operacion).filter((o) => operaciones.includes(o));
    const localidades = separar(f.localidad).map(normalizar);
    const tipos = separar(f.tipo);
    const enDolares = (f.operacion ? buscadas : operaciones)
        .map((o) => (o === 'temporario' ? p.precio : precioDe(p, o)?.precio))
        .filter((v) => typeof v === 'number');
    const enRango = (v) => (f.precioMin == null || v >= f.precioMin) && (f.precioMax == null || v <= f.precioMax);
    return (
        (!f.operacion || buscadas.length > 0) &&
        (!localidades.length || localidades.includes(normalizar(p.ciudad))) &&
        (!tipos.length || tipos.includes(tipoGeneral(p.tipoInmueble))) &&
        (f.precioMin == null && f.precioMax == null ? true : enDolares.some(enRango)) &&
        (f.ambientes == null || (ambientes != null && ambientes >= f.ambientes)) &&
        // Una o varias comodidades («pileta,wifi»): tiene que tener todas
        listaComodidades(f.comodidad).every((c) => (p.comodidades || []).includes(c))
    );
};

// Filtros del catálogo (los nombres del frontend) → los del aviso, solo valores válidos
const limpiarFiltros = (f = {}) => {
    const texto = (v, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const numero = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
    return {
        operacion: sinRepetir(separar(f.operation).filter((o) => OPERACIONES.includes(o)), 3),
        localidad: sinRepetir(separar(texto(f.location, 300)).map((l) => l.slice(0, 80)), 10),
        tipo: sinRepetir(separar(f.propertyType).filter((t) => TIPOS.includes(t)), 4),
        precioMin: numero(f.minPrice),
        precioMax: numero(f.maxPrice),
        ambientes: numero(f.rooms),
        comodidad: [...new Set(listaComodidades(f.amenities))].slice(0, 12).join(','),
    };
};

// «casa», «casa o departamento», «casa, local o terreno»
const unir = (lista) => {
    const l = lista.filter(Boolean);
    return l.length > 1 ? `${l.slice(0, -1).join(', ')} o ${l[l.length - 1]}` : l[0] || '';
};

const describirBusqueda = (f) =>
    [
        unir(separar(f.operacion).map((o) => ({ venta: 'Compra', alquiler: 'Alquiler', temporario: 'Alquiler por días' })[o])) || 'Cualquier operación',
        unir(separar(f.tipo).map((t) => ({ casa: 'casa', departamento: 'departamento', local: 'local', terreno: 'terreno' })[t])),
        f.localidad ? `en ${unir(separar(f.localidad))}` : '',
        f.ambientes ? `${f.ambientes}+ ambientes` : '',
        f.precioMin != null ? `desde USD ${f.precioMin.toLocaleString('es-AR')}` : '',
        f.precioMax != null ? `hasta USD ${f.precioMax.toLocaleString('es-AR')}` : '',
    ]
        .filter(Boolean)
        .join(' · ');

// ---------- Lo que hace el cliente ----------
const mios = (usuario) => Aviso.find({ usuario, activo: true }).sort({ createdAt: -1 }).populate('propiedad', 'titulo fotos estado ciudad categoriaOperacion operaciones').lean();

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
                    asunto: `«${p.titulo}» ya está disponible`,
                    parrafos: [`La propiedad que estabas esperando volvió a estar disponible: ${p.titulo}${p.ciudad ? `, en ${p.ciudad}` : ''}.`, 'Si te interesa, escribinos o pedí una visita cuanto antes.'],
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
                    asunto: `Entró una propiedad como la que buscás: ${p.titulo}`,
                    parrafos: [`Coincide con tu búsqueda guardada (${describirBusqueda(a.filtros)}):`, `${p.titulo}${p.ciudad ? ` · ${p.ciudad}` : ''}`],
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
