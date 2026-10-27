// HU-34: cuándo un cliente puede cancelar su visita. No usa base de datos.
// Correr solo este archivo:  node --test tests/visitas-cliente.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { puedeCancelar } = require('../src/services/visitas.service');

const ahora = { fecha: '2026-11-10', minutos: 10 * 60 }; // 10/11/2026 a las 10:00

describe('Mis visitas: cancelar', () => {
    it('se puede cancelar una visita pendiente, confirmada o reprogramada que todavía no pasó', () => {
        for (const estado of ['pendiente', 'confirmada', 'reprogramada']) {
            assert.equal(puedeCancelar({ estado, fecha: '2026-11-12', horario: '09:00' }, ahora), true, estado);
        }
    });

    it('no se puede cancelar una rechazada o ya cancelada', () => {
        assert.equal(puedeCancelar({ estado: 'rechazada', fecha: '2026-11-12', horario: '09:00' }, ahora), false);
        assert.equal(puedeCancelar({ estado: 'cancelada', fecha: '2026-11-12', horario: '09:00' }, ahora), false);
    });

    it('no se puede cancelar una visita que ya pasó, aunque sea más temprano el mismo día', () => {
        assert.equal(puedeCancelar({ estado: 'confirmada', fecha: '2026-11-09', horario: '18:00' }, ahora), false);
        assert.equal(puedeCancelar({ estado: 'confirmada', fecha: '2026-11-10', horario: '09:30 h' }, ahora), false);
        assert.equal(puedeCancelar({ estado: 'confirmada', fecha: '10/11/2026', horario: '10:30 h' }, ahora), true);
    });

    it('acepta fechas guardadas en los dos formatos', () => {
        assert.equal(puedeCancelar({ estado: 'pendiente', fecha: '12/11/2026', horario: '17:00 h' }, ahora), true);
        assert.equal(puedeCancelar({ estado: 'pendiente', fecha: 'mañana', horario: '17:00' }, ahora), false);
    });
});
