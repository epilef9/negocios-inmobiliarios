// 113/219/221: avisos de disponibilidad y búsquedas guardadas. No usa base de datos.
// Correr solo este archivo:  node --test tests/avisos.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cumpleBusqueda, limpiarFiltros, describirBusqueda } = require('../src/services/avisos.service');

const casa = { categoriaOperacion: 'alquiler', ciudad: 'Libertador San Martín', tipoInmueble: 'casa', precio: 400, ambientes: 4, comodidades: ['parrilla'] };

describe('Búsquedas guardadas', () => {
    it('limpia los filtros del catálogo y descarta valores raros', () => {
        const f = limpiarFiltros({ operation: 'alquiler', location: ' Libertador San Martín ', propertyType: 'casa', minPrice: '', maxPrice: '500', rooms: '3', amenities: 'parrilla', status: 'x', $where: 1 });
        assert.deepEqual(f, { operacion: 'alquiler', localidad: 'Libertador San Martín', tipo: 'casa', precioMin: null, precioMax: 500, ambientes: 3, comodidad: 'parrilla' });
        assert.equal(limpiarFiltros({ operation: 'robar', maxPrice: '-3', amenities: '<b>' }).operacion, '');
    });

    it('coincide con los mismos criterios del catálogo', () => {
        const f = limpiarFiltros({ operation: 'alquiler', location: 'libertador san martin', rooms: '3', maxPrice: '500' });
        assert.equal(cumpleBusqueda(casa, f), true);
        assert.equal(cumpleBusqueda({ ...casa, precio: 600 }, f), false);
        assert.equal(cumpleBusqueda({ ...casa, categoriaOperacion: 'venta' }, f), false);
        assert.equal(cumpleBusqueda({ ...casa, tipoInmueble: 'monoambiente' }, limpiarFiltros({ propertyType: 'departamento' })), true);
    });

    it('con varias comodidades, la propiedad tiene que tener todas', () => {
        const f = limpiarFiltros({ amenities: 'parrilla,pileta' });
        assert.equal(f.comodidad, 'parrilla,pileta');
        assert.equal(cumpleBusqueda(casa, f), false);
        assert.equal(cumpleBusqueda({ ...casa, comodidades: ['pileta', 'parrilla', 'wifi'] }, f), true);
        assert.equal(cumpleBusqueda(casa, limpiarFiltros({ amenities: 'parrilla' })), true, 'las búsquedas de una sola comodidad siguen igual');
        assert.equal(limpiarFiltros({ amenities: 'pileta,<b>,pileta, wifi' }).comodidad, 'pileta,wifi');
        assert.equal(limpiarFiltros({ amenities: ['pileta'] }).comodidad, '');
    });

    it('con varias operaciones, localidades o tipos, alcanza con una', () => {
        const f = limpiarFiltros({ operation: 'venta,alquiler,robar', location: 'Crespo, Libertador San Martín', propertyType: 'casa,departamento,castillo' });
        assert.deepEqual([f.operacion, f.localidad, f.tipo], ['venta,alquiler', 'Crespo,Libertador San Martín', 'casa,departamento']);
        assert.equal(cumpleBusqueda(casa, f), true);
        assert.equal(cumpleBusqueda({ ...casa, ciudad: 'Diamante' }, f), false);
        assert.equal(cumpleBusqueda({ ...casa, tipoInmueble: 'local' }, f), false);
        assert.equal(cumpleBusqueda(casa, limpiarFiltros({ operation: 'venta,temporario' })), false);
        // El precio que cuenta es el de una de las operaciones buscadas
        assert.equal(cumpleBusqueda(casa, limpiarFiltros({ operation: 'venta,alquiler', maxPrice: '500' })), true);
        assert.equal(describirBusqueda(f), 'Compra o Alquiler · casa o departamento · en Crespo o Libertador San Martín');
    });

    it('describe la búsqueda para el mail', () => {
        assert.equal(describirBusqueda(limpiarFiltros({ operation: 'venta', propertyType: 'casa', location: 'Crespo' })), 'Compra · casa · en Crespo');
    });
});


describe('Búsqueda con varias operaciones', () => {
    it('HU-25: una propiedad en venta y alquiler coincide con búsquedas de las dos operaciones, cada una con su precio', () => {
        const ambas = { ...casa, categoriaOperacion: 'venta', operaciones: ['venta', 'alquiler'], precio: 90000, precios: { venta: { precio: 90000, moneda: 'USD' }, alquiler: { precio: 400, moneda: 'USD' } } };
        assert.equal(cumpleBusqueda(ambas, { operacion: 'alquiler', precioMax: 500 }), true);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'venta', precioMax: 500 }), false);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'venta', precioMin: 80000 }), true);
        assert.equal(cumpleBusqueda(ambas, { precioMax: 500 }), true);
        assert.equal(cumpleBusqueda(ambas, { operacion: 'temporario' }), false);
    });
});
