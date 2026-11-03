const Property = require('../models/property.model');
const { operacionesDe } = require('../utils/operaciones');
const propertiesRepository = require('../repositories/properties.repository');

const DEFAULT_DOLLAR_RATE = 1370;
const PROPERTY_AMENITIES = new Set([
    'aire',
    'ascensor',
    'cocina',
    'balcon',
    'wifi',
    'tv',
    'seguridad',
    'cochera_cubierta',
    'calefaccion',
    'pileta',
    'parrilla',
    'laundry',
]);

const CAMPOS_DE_PRECIO = ['price', 'priceARS', 'moneda', 'cotizacionDolar'];

const normalizePropertyPrices = (propertyData) => {
    const normalized = { ...propertyData };
    const rate = Number(normalized.cotizacionDolar) > 0
        ? Number(normalized.cotizacionDolar)
        : DEFAULT_DOLLAR_RATE;

    normalized.cotizacionDolar = rate;

    if (normalized.moneda === 'ARS') {
        const priceARS = Number(normalized.priceARS ?? normalized.price);
        normalized.priceARS = priceARS;
        normalized.price = Number((priceARS / rate).toFixed(2));
    } else {
        normalized.moneda = 'USD';
        normalized.price = Number(normalized.price);
        normalized.priceARS = Number((normalized.price * rate).toFixed(2));
    }

    return normalized;
};

// Pasa un precio cargado en el formulario ({ moneda, price o priceARS }) a { price en USD, moneda, priceARS }
const normalizarPrecio = (entrada, rate) => {
    if (entrada.moneda === 'ARS') {
        const priceARS = Number(entrada.priceARS ?? entrada.price);
        return { price: Number((priceARS / rate).toFixed(2)), moneda: 'ARS', priceARS };
    }
    const price = Number(entrada.price);
    return { price, moneda: 'USD', priceARS: Number((price * rate).toFixed(2)) };
};

// HU-25 / RF-03: arma operaciones, el precio de cada una y la copia de la principal (categoria_operacion,
// price, moneda y priceARS). Acepta también el formato viejo (solo categoria_operacion y price).
// Si el cambio no toca operaciones ni precios, lo devuelve igual.
const normalizarOperaciones = (propertyData) => {
    const datos = { ...propertyData };
    // Derivado de operaciones: ya no se guarda aparte
    delete datos.operacionesSolicitud;

    const nuevas = Array.isArray(datos.operaciones) ? operacionesDe({ operaciones: datos.operaciones }) : null;
    const operaciones = nuevas?.length ? nuevas : datos.categoria_operacion ? operacionesDe({ categoria_operacion: datos.categoria_operacion }) : null;
    if (!operaciones?.length) {
        delete datos.precios;
        return CAMPOS_DE_PRECIO.some((campo) => datos[campo] !== undefined) ? normalizePropertyPrices(datos) : datos;
    }

    const rate = Number(datos.cotizacionDolar) > 0 ? Number(datos.cotizacionDolar) : DEFAULT_DOLLAR_RATE;
    datos.cotizacionDolar = rate;
    datos.operaciones = operaciones;
    datos.categoria_operacion = operaciones[0];

    if (operaciones[0] === 'temporario') {
        // El temporario usa su precio por noche; el precio general queda como referencia, como antes
        datos.precios = {};
        return datos.price !== undefined ? normalizePropertyPrices(datos) : datos;
    }

    const precios = {};
    operaciones.forEach((operacion, indice) => {
        const entrada = datos.precios?.[operacion]
            // Formato viejo: el precio general es el de la única operación
            ?? (indice === 0 && !nuevas && datos.price !== undefined ? { price: datos.price, moneda: datos.moneda, priceARS: datos.priceARS } : null);
        if (entrada) precios[operacion] = normalizarPrecio(entrada, rate);
    });
    datos.precios = precios;
    const principal = precios[operaciones[0]];
    if (principal) Object.assign(datos, principal);
    return datos;
};

const getAllProperties = async (filters = {}) => {
    // Las reservas con seña vencidas devuelven su propiedad a «Disponible» antes de mostrar el catálogo
    await require('./reservasPropiedad.service').vencerReservas().catch((e) => console.error('No se pudieron vencer las reservas:', e.message));
    const query = {};
    if (typeof filters.comodidad === 'string' && filters.comodidad.trim()) {
        const amenity = filters.comodidad.trim();
        query.comodidades = PROPERTY_AMENITIES.has(amenity) ? amenity : '__invalid_amenity__';
    }

    return propertiesRepository.getAllProperties(query);
};

const getPropertyById = async (id) => {
    return propertiesRepository.getPropertyById(id);
};

const createProperty = async (propertyData) => {
    const propiedad = await propertiesRepository.createProperty(normalizarOperaciones(propertyData));
    // 221: búsquedas guardadas que coinciden con la propiedad nueva (no frena la respuesta)
    require('./avisos.service').coincidenciasDeBusqueda(propiedad?.toObject ? propiedad.toObject() : propiedad);
    return propiedad;
};

// Los precios se recalculan solo si el cambio trae operaciones, precios, precio o moneda. Un cambio parcial (por
// ejemplo, solo el estado desde el listado del panel) no debe tocarlos: antes los dejaba en NaN y fallaba.
const updateProperty = async (id, propertyData) => {
    // Los avisos y las reservas con seña se revisan solo con un id real (las pruebas usan ids de mentira)
    const idReal = require('mongoose').isValidObjectId(String(id));
    const antes = propertyData.estado && idReal ? await Property.findById(id).select('estado').lean() : null;
    const datos = normalizarOperaciones(propertyData);
    // HU-28: recordar que ya se vendió, para que la venta no se reabra si después se alquila
    if (datos.estado === 'vendido') datos.vendida = true;
    if (datos.estado === 'disponible') datos.vendida = false;
    const propiedad = await propertiesRepository.updateProperty(id, datos);
    await require('./solicitudes-ciclo.service').cerrarPorPropiedad(propiedad);
    // Si el administrador cambia a mano el estado de una propiedad reservada con seña, la reserva se cierra igual
    if (idReal && propiedad && propertyData.estado && propertyData.estado !== 'reservado') {
        await require('./reservasPropiedad.service').cerrarPorCambioDeEstado(propiedad._id, propertyData.estado);
    }
    // 113/219: pasó de alquilada/reservada/vendida a disponible → avisos de disponibilidad y búsquedas
    if (propiedad && antes && antes.estado && antes.estado !== 'disponible' && propertyData.estado === 'disponible') {
        require('./avisos.service').propiedadDisponible(propiedad._id);
    }
    return propiedad;
};

const deleteProperty = async (id) => {
    return propertiesRepository.deleteProperty(id);
};

const reorderProperties = async (items) => {
    return propertiesRepository.reorderProperties(items);
};

module.exports = {
    normalizarOperaciones,
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
};