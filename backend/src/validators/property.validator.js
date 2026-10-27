const mongoose = require('mongoose');

const requiredFields = ['title', 'price', 'location', 'bedrooms', 'bathrooms', 'area'];
const numericFields = [
    'price',
    'priceARS',
    'cotizacionDolar',
    'bedrooms',
    'bathrooms',
    'area',
    'cantidad_ambientes',
    'montoExpensas',
    'precioPorNocheUSD',
    'minimoNoches',
    'huespedesMaximos',
    'costoLimpiezaUSD',
    'duracionAlquilerMeses',
];
const allowedFields = new Set([
    'title', 'codigoInterno', 'description', 'price', 'moneda', 'priceARS', 'cotizacionDolar',
    'location', 'ciudad', 'provincia', 'direccionCompleta', 'referenciasUbicacion',
    'categoria_operacion', 'tipo_inmueble', 'cantidad_ambientes', 'comodidades', 'otrasComodidades',
    'expensas', 'montoExpensas', 'cochera', 'pisoUnidad', 'linkGoogleMaps', 'latitud', 'longitud',
    'permitirVisita', 'permitirWhatsApp', 'permitirEmail', 'permitirSolicitudes', 'operacionesSolicitud', 'horarioAtencion', 'telefonoWhatsApp',
    'precioPorNocheUSD', 'minimoNoches', 'huespedesMaximos', 'costoLimpiezaUSD',
    'duracionAlquilerMeses', 'unidadDuracionAlquiler', 'checkInDesde', 'checkOutHasta',
    'checkInFlexible', 'estado', 'images', 'descuento', 'financiacion',
    'bedrooms', 'bathrooms', 'area',
]);
const stringLimits = {
    title: 160, codigoInterno: 60, description: 3000, location: 240, ciudad: 100,
    direccionCompleta: 240, referenciasUbicacion: 500, otrasComodidades: 500,
    linkGoogleMaps: 1000, latitud: 40, longitud: 40, horarioAtencion: 100,
    telefonoWhatsApp: 40, checkInDesde: 20, checkOutHasta: 20,
};

// Límites aproximados de Entre Ríos, con margen (la inmobiliaria solo opera ahí)
const dentroDeEntreRios = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34.3 && lat <= -29.9 && lng >= -61 && lng <= -57.4;

const esObjetoPlano = (v) => v && typeof v === 'object' && !Array.isArray(v);
const soloCampos = (obj, campos) => Object.keys(obj).every((k) => campos.includes(k));
const numeroEntre = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Devuelve el problema de descuento/financiación, o null si están bien (o no vinieron)
const revisarOferta = ({ descuento, financiacion }) => {
    if (descuento !== undefined && descuento !== null) {
        if (!esObjetoPlano(descuento) || !soloCampos(descuento, ['porcentaje', 'hasta', 'motivo'])) return 'descuento tiene un formato inválido';
        if (!numeroEntre(descuento.porcentaje, 0, 90)) return 'El descuento tiene que ser un porcentaje entre 0 y 90';
        if (descuento.hasta !== undefined && descuento.hasta !== null && descuento.hasta !== '' && (typeof descuento.hasta !== 'string' || Number.isNaN(Date.parse(descuento.hasta)))) {
            return 'La fecha hasta la que vale el descuento no es válida';
        }
        if (descuento.motivo !== undefined && (typeof descuento.motivo !== 'string' || descuento.motivo.length > 120)) return 'El motivo del descuento puede tener hasta 120 caracteres';
    }
    if (financiacion !== undefined && financiacion !== null) {
        if (!esObjetoPlano(financiacion) || !soloCampos(financiacion, ['disponible', 'anticipoPorcentaje', 'cuotas', 'tasa', 'detalle'])) return 'financiacion tiene un formato inválido';
        if (typeof financiacion.disponible !== 'boolean') return 'financiacion.disponible debe ser booleano';
        if (financiacion.anticipoPorcentaje !== undefined && !numeroEntre(financiacion.anticipoPorcentaje, 0, 100)) return 'El anticipo tiene que estar entre 0 y 100 %';
        if (financiacion.cuotas !== undefined && (!Number.isInteger(financiacion.cuotas) || !numeroEntre(financiacion.cuotas, 0, 360))) return 'Las cuotas tienen que ser un número entero entre 0 y 360';
        if (financiacion.disponible && !(financiacion.cuotas >= 1)) return 'Indicá en cuántas cuotas se financia';
        if (financiacion.tasa !== undefined && (typeof financiacion.tasa !== 'string' || financiacion.tasa.length > 60)) return 'La tasa puede tener hasta 60 caracteres';
        if (financiacion.detalle !== undefined && (typeof financiacion.detalle !== 'string' || financiacion.detalle.length > 500)) return 'El detalle de la financiación puede tener hasta 500 caracteres';
    }
    return null;
};

const validateProperty = (req, res, next) => {
    const errors = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ message: 'El cuerpo de la propiedad debe ser un objeto' });
    }

    if (isUpdate) {
        delete req.body._id;
        delete req.body.id;
        delete req.body.createdAt;
        delete req.body.updatedAt;
        delete req.body.__v;
    }

    const unknownFields = Object.keys(req.body).filter((field) =>
        !allowedFields.has(field) || field.includes('.') || field.startsWith('$')
    );
    if (unknownFields.length > 0) {
        errors.push(`Campos no permitidos: ${unknownFields.join(', ')}`);
    }

    Object.entries(stringLimits).forEach(([field, maxLength]) => {
        if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > maxLength)) {
            errors.push(`${field} debe ser un texto de hasta ${maxLength} caracteres`);
        }
    });

    ['permitirVisita', 'permitirWhatsApp', 'permitirEmail', 'permitirSolicitudes'].forEach((field) => {
        if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
            errors.push(`${field} debe ser booleano`);
        }
    });

    if (req.body.operacionesSolicitud !== undefined && (
        !Array.isArray(req.body.operacionesSolicitud) ||
        req.body.operacionesSolicitud.some((operacion) => !['venta', 'alquiler'].includes(operacion)) ||
        new Set(req.body.operacionesSolicitud).size !== req.body.operacionesSolicitud.length
    )) {
        errors.push('operacionesSolicitud debe contener una sola vez cada operación válida (venta o alquiler)');
    }
    if (req.body.categoria_operacion === 'temporario' && Array.isArray(req.body.operacionesSolicitud) && req.body.operacionesSolicitud.length) {
        errors.push('Las propiedades temporarias no admiten solicitudes de compra o alquiler permanente');
    }

    if (!isUpdate) {
        requiredFields.forEach((field) => {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                errors.push(`${field} es obligatorio`);
            }
        });
    }

    numericFields.forEach((field) => {
        const value = req.body[field];
        const hasValidType = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
        if (value !== undefined && (!hasValidType || !Number.isFinite(Number(value)) || Number(value) < 0)) {
            errors.push(`${field} debe ser un número no negativo`);
        }
    });

    if (req.body.images !== undefined && (!Array.isArray(req.body.images) || req.body.images.some((image) => typeof image !== 'string'))) {
        errors.push('images debe ser un arreglo de textos');
    }

    if (Array.isArray(req.body.images) && req.body.images.length > 20) {
        errors.push('images no puede contener más de 20 elementos');
    }

    if (Array.isArray(req.body.comodidades) && (req.body.comodidades.length > 30 || req.body.comodidades.some((item) => typeof item !== 'string' || item.length > 80))) {
        errors.push('comodidades contiene valores inválidos');
    }

    // HU-12: descuento y financiación, con forma fija (nada de campos extra)
    const errorOferta = revisarOferta(req.body);
    if (errorOferta) errors.push(errorOferta);

    // Ubicación obligatoria (sin punto la propiedad no aparece en el mapa) y dentro de Entre Ríos
    const latitud = req.body.latitud;
    const longitud = req.body.longitud;
    const tocaUbicacion = latitud !== undefined || longitud !== undefined;
    if (!isUpdate || tocaUbicacion) {
        const lat = Number(String(latitud ?? '').trim() || NaN);
        const lng = Number(String(longitud ?? '').trim() || NaN);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            errors.push('La ubicación es obligatoria: marcá el punto en el mapa (latitud y longitud)');
        } else if (!dentroDeEntreRios(lat, lng)) {
            errors.push('La ubicación tiene que estar dentro de Entre Ríos');
        }
    }

    if (req.body.provincia !== undefined && req.body.provincia !== 'entre_rios') {
        errors.push('La inmobiliaria solo opera en Entre Ríos');
    }

    if (req.body.unidadDuracionAlquiler !== undefined && !['meses', 'años'].includes(req.body.unidadDuracionAlquiler)) {
        errors.push('La unidad de duración debe ser meses o años');
    }

    if (req.body.unidadDuracionAlquiler === 'meses' && Number(req.body.duracionAlquilerMeses) > 11) {
        errors.push('La duración en meses no puede superar los 11 meses');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Datos de propiedad inválidos', errors });
    }

    next();
};

const validatePropertyId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'El id de la propiedad no es válido' });
    }

    next();
};

module.exports = { validateProperty, validatePropertyId, dentroDeEntreRios };