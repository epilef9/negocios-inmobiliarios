// HU-25 / RF-03: una propiedad puede estar en venta y en alquiler al mismo tiempo, cada operación con su precio.
// El alquiler temporario es exclusivo: no se combina con venta ni alquiler (tiene su propio precio por noche).
//
// Fuente de verdad: `operaciones` (['venta'], ['alquiler'], ['venta', 'alquiler'] o ['temporario']) y
// `precios.venta` / `precios.alquiler` ({ precio en USD, moneda en que se cargó, precioARS }).
// `categoriaOperacion`, `precio`, `moneda` y `precioARS` quedan como copia de la operación principal (venta si
// está, si no la única), para ordenar el catálogo y para lo que todavía lee un solo valor.
//
// Estas funciones también entienden las propiedades cargadas antes del cambio (solo categoriaOperacion y precio).

const OPERACIONES = ['venta', 'alquiler', 'temporario'];
const CON_PRECIO_PROPIO = ['venta', 'alquiler'];

const ordenar = (lista) => CON_PRECIO_PROPIO.filter((operacion) => lista.includes(operacion));

// Operaciones de la propiedad, en orden (venta antes que alquiler)
const operacionesDe = (p) => {
    const lista = Array.isArray(p?.operaciones) ? p.operaciones.filter((o) => OPERACIONES.includes(o)) : [];
    if (lista.includes('temporario')) return ['temporario'];
    if (lista.length) return ordenar(lista);
    return OPERACIONES.includes(p?.categoriaOperacion) ? [p.categoriaOperacion] : [];
};

const principalDe = (p) => operacionesDe(p)[0] || 'venta';

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Precio de una operación ({ precio, moneda, precioARS }) o null si esa operación no tiene precio
const precioDe = (p, operacion) => {
    const guardado = p?.precios?.[operacion];
    if (guardado && numero(guardado.precio) !== null) {
        return { precio: guardado.precio, moneda: guardado.moneda === 'ARS' ? 'ARS' : 'USD', precioARS: numero(guardado.precioARS) ?? undefined };
    }
    if (principalDe(p) === operacion && numero(p?.precio) !== null) {
        return { precio: p.precio, moneda: p.moneda === 'ARS' ? 'ARS' : 'USD', precioARS: numero(p.precioARS) ?? undefined };
    }
    return null;
};

// Operaciones que siguen abiertas según el estado de la propiedad entera.
// Reservada, vendida o alquilada cierra todo; la excepción es la venta con inquilino adentro (HU-28):
// una propiedad alquilada que también está en venta se puede seguir vendiendo. No vale si ya se vendió
// y después el comprador la alquiló (vendida: true), porque esa venta ya se concretó.
const operacionesAbiertas = (p) => {
    const operaciones = operacionesDe(p);
    const estado = p?.estado || 'disponible';
    if (estado === 'disponible') return operaciones;
    if (estado === 'alquilado' && operaciones.includes('venta') && !p?.vendida) return ['venta'];
    return [];
};

// Operación de la propiedad que corresponde a una solicitud ('compra' o 'alquiler')
const operacionDeSolicitud = (operacionSolicitud) => (operacionSolicitud === 'compra' ? 'venta' : 'alquiler');

module.exports = { OPERACIONES, CON_PRECIO_PROPIO, operacionesDe, principalDe, precioDe, operacionesAbiertas, operacionDeSolicitud };
