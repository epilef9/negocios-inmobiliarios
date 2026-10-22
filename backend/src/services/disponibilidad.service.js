// Disponibilidad de las propiedades de alquiler temporario: qué noches no se pueden alquilar.
// Las reglas de rangos son funciones puras (se prueban sin base de datos); el resto consulta Mongo.

const mongoose = require('mongoose');
const Disponibilidad = require('../models/disponibilidad.model');
const Property = require('../models/property.model');
const ApiError = require('../utils/api-error');
const { ahoraEnArgentina, sumarDias } = require('./agenda.service');

const TIPOS = ['bloqueo', 'ocupada', 'reserva'];
// Un solo rango no puede pasar de un año (evita cargas por error, como 2062 en vez de 2026)
const NOCHES_MAXIMAS = 366;
// El sitio muestra hasta un año adelante
const DIAS_PUBLICOS = 365;

// "2026-02-30" tiene el formato pero no existe: se compara contra la fecha que arma Date
const esFechaValida = (texto) => {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const [a, m, d] = texto.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d)).toISOString().slice(0, 10) === texto;
};

const nochesEntre = (desde, hasta) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);

// Devuelve el motivo por el que el rango no sirve, o null si está bien
const validarRango = ({ desde, hasta, tipo }) => {
    if (!esFechaValida(desde) || !esFechaValida(hasta)) return 'Las fechas deben tener el formato AAAA-MM-DD y existir.';
    if (desde >= hasta) return 'La fecha de salida tiene que ser posterior a la de entrada.';
    if (nochesEntre(desde, hasta) > NOCHES_MAXIMAS) return 'Un rango no puede superar un año. Cargalo en partes.';
    if (tipo !== undefined && !TIPOS.includes(tipo)) return 'El tipo debe ser bloqueo, ocupada o reserva.';
    return null;
};

// `hasta` no se cuenta: [1, 5) y [5, 8) no se pisan
const seSolapan = (a, b) => a.desde < b.hasta && b.desde < a.hasta;

const buscarSolapamiento = (rango, existentes) => existentes.find((otro) => seSolapan(rango, otro)) || null;

const propiedadTemporaria = async (propiedadId) => {
    if (!mongoose.isValidObjectId(propiedadId)) throw ApiError.badRequest('El id de la propiedad no es válido');
    const propiedad = await Property.findById(propiedadId).select('categoria_operacion minimoNoches precioPorNocheUSD').lean();
    if (!propiedad) throw ApiError.notFound('Propiedad no encontrada');
    if (propiedad.categoria_operacion !== 'temporario') {
        throw ApiError.badRequest('La disponibilidad solo se maneja en propiedades de alquiler temporario');
    }
    return propiedad;
};

// Para el sitio: solo qué noches están tomadas, desde hoy y hasta un año adelante. Sin tipo ni motivo.
const disponibilidadPublica = async (propiedadId) => {
    const propiedad = await propiedadTemporaria(propiedadId);
    const hoy = ahoraEnArgentina().fecha;
    const limite = sumarDias(hoy, DIAS_PUBLICOS);
    const rangos = await Disponibilidad.find({ propiedad: propiedadId, hasta: { $gt: hoy }, desde: { $lt: limite } })
        .sort({ desde: 1 })
        .select('desde hasta -_id')
        .lean();
    return {
        ocupadas: rangos.map(({ desde, hasta }) => ({ desde, hasta })),
        minimoNoches: propiedad.minimoNoches || 1,
        precioPorNocheUSD: propiedad.precioPorNocheUSD ?? null,
        hoy,
        hasta: limite,
    };
};

// Para el panel: todos los rangos, con tipo y motivo
const listarRangos = async (propiedadId) => {
    await propiedadTemporaria(propiedadId);
    return Disponibilidad.find({ propiedad: propiedadId }).sort({ desde: 1 });
};

const crearRango = async ({ propiedad, desde, hasta, tipo = 'bloqueo', motivo = '' }) => {
    await propiedadTemporaria(propiedad);
    const error = validarRango({ desde, hasta, tipo });
    if (error) throw ApiError.badRequest(error);

    // Basta con buscar uno que empiece antes de esta salida y termine después de esta entrada
    const choca = await Disponibilidad.findOne({ propiedad, desde: { $lt: hasta }, hasta: { $gt: desde } }).lean();
    if (choca) {
        throw new ApiError(409, `Se pisa con otro rango ya cargado (del ${choca.desde} al ${choca.hasta}).`);
    }

    const textoMotivo = typeof motivo === 'string' ? motivo.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200) : '';
    return Disponibilidad.create({ propiedad, desde, hasta, tipo, motivo: textoMotivo });
};

const eliminarRango = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('El id del rango no es válido');
    return Disponibilidad.findByIdAndDelete(id);
};

// Al borrar una propiedad se van también sus rangos
const eliminarDePropiedad = async (propiedadId) => Disponibilidad.deleteMany({ propiedad: propiedadId });

module.exports = {
    esFechaValida,
    validarRango,
    seSolapan,
    buscarSolapamiento,
    disponibilidadPublica,
    listarRangos,
    crearRango,
    eliminarRango,
    eliminarDePropiedad,
};
