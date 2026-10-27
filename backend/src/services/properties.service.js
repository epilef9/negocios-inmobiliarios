const Property = require('../models/property.model');
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
    const propiedad = await propertiesRepository.createProperty(normalizePropertyPrices(propertyData));
    // 221: búsquedas guardadas que coinciden con la propiedad nueva (no frena la respuesta)
    require('./avisos.service').coincidenciasDeBusqueda(propiedad?.toObject ? propiedad.toObject() : propiedad);
    return propiedad;
};

// Los precios se recalculan solo si el cambio trae precio o moneda. Un cambio parcial (por ejemplo, solo el
// estado desde el listado del panel) no debe tocarlos: antes los dejaba en NaN y la actualización fallaba.
const CAMPOS_DE_PRECIO = ['price', 'priceARS', 'moneda', 'cotizacionDolar'];
const updateProperty = async (id, propertyData) => {
    const cambiaPrecio = CAMPOS_DE_PRECIO.some((campo) => propertyData[campo] !== undefined);
    // Los avisos y las reservas con seña se revisan solo con un id real (las pruebas usan ids de mentira)
    const idReal = require('mongoose').isValidObjectId(String(id));
    const antes = propertyData.estado && idReal ? await Property.findById(id).select('estado').lean() : null;
    const propiedad = await propertiesRepository.updateProperty(id, cambiaPrecio ? normalizePropertyPrices(propertyData) : propertyData);
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
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
};