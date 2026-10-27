// 223: cuándo un contrato vence pronto o le toca actualizar el precio. No usa base de datos.
// Correr solo este archivo:  node --test tests/recordatorios.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { tocaActualizar, venceProntoDias, mesesEntre } = require('../src/services/recordatorios.service');

describe('Recordatorios de contratos', () => {
    it('cuenta meses entre fechas', () => {
        assert.equal(mesesEntre('2026-01-15', '2026-07-01'), 6);
        assert.equal(mesesEntre('2025-11-01', '2026-02-10'), 3);
    });

    it('actualiza cada N meses desde el inicio, no el mes en que empieza', () => {
        const c = { fechaInicio: '2026-01-10', fechaFin: '2028-01-09', ajuste: 'Trimestral' };
        assert.equal(tocaActualizar(c, '2026-01-20'), false);
        assert.equal(tocaActualizar(c, '2026-04-02'), true);
        assert.equal(tocaActualizar(c, '2026-05-02'), false);
        assert.equal(tocaActualizar({ ...c, ajuste: 'Semestral' }, '2026-07-31'), true);
        assert.equal(tocaActualizar({ ...c, fechaInicio: '10/01/2026' }, '2026-10-05'), true);
        assert.equal(tocaActualizar({ ...c, ajuste: undefined }, '2026-04-02'), false);
    });

    it('avisa los que vencen en 60 días o menos', () => {
        assert.equal(venceProntoDias({ fechaFin: '2026-12-31' }, '2026-11-01'), 60);
        assert.equal(venceProntoDias({ fechaFin: '2027-01-01' }, '2026-11-01'), null);
        assert.equal(venceProntoDias({ fechaFin: '2026-10-31' }, '2026-11-01'), null);
    });
});

describe('Resumen de la bienvenida', () => {
    const { ordenarPendientes } = require('../src/routes/panel.routes');
    it('deja afuera lo que está en cero y ordena por urgencia', () => {
        const lista = ordenarPendientes([
            { clave: 'fotos', urgencia: 3, orden: 20, cantidad: 2 },
            { clave: 'nada', urgencia: 1, orden: 1, cantidad: 0 },
            { clave: 'solicitudes', urgencia: 2, orden: 13, cantidad: 5 },
            { clave: 'pagos', urgencia: 1, orden: 3, cantidad: 1 },
            { clave: 'hoy', urgencia: 1, orden: 0, cantidad: 2 },
        ]);
        assert.deepEqual(lista.map((i) => i.clave), ['hoy', 'pagos', 'solicitudes', 'fotos']);
    });
});

describe('Accesos rápidos del inicio', () => {
    const { limpiarAccesos } = require('../src/routes/panel.routes');

    it('saca repetidos, claves raras y corta en 12', () => {
        assert.deepEqual(limpiarAccesos(['visitas', 'visitas', 'Mal Clave', 5, 'ver-sitio']), ['visitas', 'ver-sitio']);
        assert.equal(limpiarAccesos(Array.from({ length: 20 }, (_, i) => `a${i}`)).length, 12);
        assert.deepEqual(limpiarAccesos([]), []);
        assert.equal(limpiarAccesos('visitas'), null);
    });
});
