// 113/219/221: avisos de disponibilidad y búsquedas guardadas. No usa base de datos.
// Correr solo este archivo:  node --test tests/avisos.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cumpleBusqueda, limpiarFiltros, describirBusqueda } = require('../src/services/avisos.service');

const casa = { categoria_operacion: 'alquiler', ciudad: 'Libertador San Martín', tipo_inmueble: 'casa', price: 400, cantidad_ambientes: 4, comodidades: ['parrilla'] };

describe('Búsquedas guardadas', () => {
    it('limpia los filtros del catálogo y descarta valores raros', () => {
        const f = limpiarFiltros({ operation: 'alquiler', location: ' Libertador San Martín ', propertyType: 'casa', minPrice: '', maxPrice: '500', rooms: '3', amenities: 'parrilla', status: 'x', $where: 1 });
        assert.deepEqual(f, { operacion: 'alquiler', localidad: 'Libertador San Martín', tipo: 'casa', precioMin: null, precioMax: 500, ambientes: 3, comodidad: 'parrilla' });
        assert.equal(limpiarFiltros({ operation: 'robar', maxPrice: '-3', amenities: '<b>' }).operacion, '');
    });

    it('coincide con los mismos criterios del catálogo', () => {
        const f = limpiarFiltros({ operation: 'alquiler', location: 'libertador san martin', rooms: '3', maxPrice: '500' });
        assert.equal(cumpleBusqueda(casa, f), true);
        assert.equal(cumpleBusqueda({ ...casa, price: 600 }, f), false);
        assert.equal(cumpleBusqueda({ ...casa, categoria_operacion: 'venta' }, f), false);
        assert.equal(cumpleBusqueda({ ...casa, tipo_inmueble: 'monoambiente' }, limpiarFiltros({ propertyType: 'departamento' })), true);
    });

    it('describe la búsqueda para el mail', () => {
        assert.equal(describirBusqueda(limpiarFiltros({ operation: 'venta', propertyType: 'casa', location: 'Crespo' })), 'Compra · casa · en Crespo');
    });
});


describe('Búsqueda con varias operaciones', () => {
    it('HU-25: una propiedad en venta y alquiler coincide con búsquedas de las dos operaciones, cada una con su precio', () => {
        const ambas = { ...casa, categoria_operacion: 'venta', operaciones: ['venta', 'alquiler'], price: 90000, precios: { venta: { price: 90000, moneda: 'USD' }, alquiler: { price: 400, moneda: 'USD' } } };
        assert.equal(cumpleBusqueda(ambas, { operacion: 'alquiler', precioMax: 500 }), true);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'venta', precioMax: 500 }), false);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'venta', precioMin: 80000 }), true);
        assert.equal(cumpleBusqueda(ambas, { precioMax: 500 }), true);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'temporario' }), false);
    });
});
