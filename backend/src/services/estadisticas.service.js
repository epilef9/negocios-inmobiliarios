// Estadísticas de las propiedades (222): vistas de la ficha, clics en WhatsApp, visitas agendadas,
// favoritos y solicitudes, contados por día.
const mongoose = require('mongoose');
const Estadistica = require('../models/estadistica.model');
const Property = require('../models/property.model');
const { operacionesDe } = require('../utils/operaciones');

const CAMPOS = ['vistas', 'whatsapp', 'visitas', 'favoritos', 'solicitudes'];
// Lo que puede contar el navegador; el resto lo cuenta el servidor cuando pasa de verdad
const EVENTOS_PUBLICOS = { vista: 'vistas', whatsapp: 'whatsapp' };

const hoyArgentina = (fecha = new Date()) => fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const restarDias = (iso, dias) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return d.toISOString().slice(0, 10);
};

// Suma 1 al contador del día. Nunca rompe la operación que la llama.
const sumar = async (propiedadId, campo) => {
    if (!CAMPOS.includes(campo) || !mongoose.isValidObjectId(propiedadId)) return;
    try {
        await Estadistica.updateOne({ propiedad: propiedadId, dia: hoyArgentina() }, { $inc: { [campo]: 1 } }, { upsert: true });
    } catch (error) {
        console.error('No se pudo sumar la estadística:', error.message);
    }
};

// Evento que manda el navegador: solo de propiedades que existen
const registrarEvento = async (propiedadId, tipo) => {
    const campo = EVENTOS_PUBLICOS[tipo];
    if (!campo || !mongoose.isValidObjectId(propiedadId)) return false;
    if (!(await Property.exists({ _id: propiedadId }))) return false;
    await sumar(propiedadId, campo);
    return true;
};

// Resumen de un período: totales, cada propiedad con sus números (la más vista arriba) y la serie por día
const resumen = async (dias = 30) => {
    const periodo = [7, 30, 90, 365].includes(Number(dias)) ? Number(dias) : 30;
    const hasta = hoyArgentina();
    const desde = restarDias(hasta, periodo - 1);
    const suma = Object.fromEntries(CAMPOS.map((c) => [c, { $sum: `$${c}` }]));

    const [porPropiedad, porDia, propiedades] = await Promise.all([
        Estadistica.aggregate([{ $match: { dia: { $gte: desde, $lte: hasta } } }, { $group: { _id: '$propiedad', ...suma } }]),
        Estadistica.aggregate([{ $match: { dia: { $gte: desde, $lte: hasta } } }, { $group: { _id: '$dia', ...suma } }, { $sort: { _id: 1 } }]),
        Property.find().select('titulo estado categoriaOperacion operaciones fotos ciudad').lean(),
    ]);

    const datos = new Map(porPropiedad.map((p) => [String(p._id), p]));
    const filas = propiedades
        .map((p) => {
            const d = datos.get(String(p._id)) || {};
            return {
                id: String(p._id),
                titulo: p.titulo,
                estado: p.estado || 'disponible',
                operacion: p.categoriaOperacion || '',
                operaciones: operacionesDe(p),
                ciudad: p.ciudad || '',
                foto: p.fotos?.[0] || '',
                ...Object.fromEntries(CAMPOS.map((c) => [c, d[c] || 0])),
            };
        })
        .sort((a, b) => b.vistas - a.vistas || b.whatsapp - a.whatsapp || a.titulo.localeCompare(b.titulo));

    const totales = Object.fromEntries(CAMPOS.map((c) => [c, filas.reduce((s, f) => s + f[c], 0)]));
    const serie = [];
    const delDia = new Map(porDia.map((d) => [d._id, d]));
    for (let i = periodo - 1; i >= 0; i--) {
        const dia = restarDias(hasta, i);
        const d = delDia.get(dia) || {};
        serie.push({ dia, ...Object.fromEntries(CAMPOS.map((c) => [c, d[c] || 0])) });
    }
    return { desde, hasta, dias: periodo, totales, propiedades: filas, serie };
};

// ---------- Para quien publicó la propiedad (Mi cuenta → Tus publicaciones) ----------
// Solo números: nunca quién miró, quién guardó en favoritos ni quién pidió una visita.

const periodoValido = (dias) => ([7, 30, 90, 365].includes(Number(dias)) ? Number(dias) : 30);

// Propiedades de una persona: las que publicó desde el sitio (pedido aprobado) y las que la inmobiliaria cargó a su nombre
const propiasDe = async (usuarioId) => {
    if (!mongoose.isValidObjectId(usuarioId)) return [];
    const SolicitudPublicacion = require('../models/solicitudPublicacion.model');
    const [publicadas, aSuNombre] = await Promise.all([
        SolicitudPublicacion.find({ cliente: usuarioId, estado: 'aprobada', propiedadCreada: { $ne: null } }).select('propiedadCreada').lean(),
        Property.find({ 'propietario.usuario': usuarioId }).select('_id').lean(),
    ]);
    return [...new Set([...publicadas.map((p) => String(p.propiedadCreada)), ...aSuNombre.map((p) => String(p._id))])];
};

// Arma la respuesta con las filas de la base (una por propiedad y día): totales del período y vistas día por día
const armarDeDueno = (propiedades, filas, { desde, hasta, dias }) => {
    const porPropiedad = new Map(propiedades.map((p) => [String(p._id), new Map()]));
    for (const f of filas) porPropiedad.get(String(f._id.propiedad))?.set(f._id.dia, f);
    const lista = propiedades.map((p) => {
        const delDia = porPropiedad.get(String(p._id));
        const total = Object.fromEntries(CAMPOS.map((c) => [c, 0]));
        for (const f of delDia.values()) for (const c of CAMPOS) total[c] += f[c] || 0;
        const serie = [];
        for (let i = dias - 1; i >= 0; i--) {
            const dia = restarDias(hasta, i);
            serie.push({ dia, vistas: delDia.get(dia)?.vistas || 0 });
        }
        return { id: String(p._id), titulo: p.titulo, estado: p.estado || 'disponible', operaciones: operacionesDe(p), foto: p.fotos?.[0] || '', ...total, serie };
    });
    const totales = Object.fromEntries(CAMPOS.map((c) => [c, lista.reduce((s, f) => s + f[c], 0)]));
    return { desde, hasta, dias, totales, propiedades: lista };
};

const deDueno = async (usuarioId, dias = 30) => {
    const periodo = periodoValido(dias);
    const hasta = hoyArgentina();
    const desde = restarDias(hasta, periodo - 1);
    const ids = (await propiasDe(usuarioId)).map((id) => new mongoose.Types.ObjectId(id));
    if (!ids.length) return { desde, hasta, dias: periodo, totales: Object.fromEntries(CAMPOS.map((c) => [c, 0])), propiedades: [] };
    const suma = Object.fromEntries(CAMPOS.map((c) => [c, { $sum: `$${c}` }]));
    const [propiedades, filas] = await Promise.all([
        Property.find({ _id: { $in: ids } }).select('titulo estado categoriaOperacion operaciones fotos').sort({ createdAt: -1 }).lean(),
        Estadistica.aggregate([{ $match: { propiedad: { $in: ids }, dia: { $gte: desde, $lte: hasta } } }, { $group: { _id: { propiedad: '$propiedad', dia: '$dia' }, ...suma } }]),
    ]);
    return armarDeDueno(propiedades, filas, { desde, hasta, dias: periodo });
};

module.exports = { CAMPOS, EVENTOS_PUBLICOS, hoyArgentina, restarDias, sumar, registrarEvento, resumen, propiasDe, armarDeDueno, deDueno };
