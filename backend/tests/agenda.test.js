// Reglas del horario de visitas (HU-19): turnos, validación, texto y días cerrados. No usa base de datos.
// Correr solo este archivo:  node --test tests/agenda.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { HORARIO_INICIAL, turnosDe, validarHorario, textoHorario, libresDelDia } = require('../src/services/agenda.service');

const copia = () => JSON.parse(JSON.stringify(HORARIO_INICIAL));

describe('Agenda: turnos', () => {
    it('el horario de siempre da los mismos turnos que antes', () => {
        const lunes = turnosDe(HORARIO_INICIAL.semana[1].tramos, 30);
        assert.deepEqual(lunes, ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '17:00', '17:30', '18:00', '18:30']);
        assert.equal(turnosDe(HORARIO_INICIAL.semana[0].tramos, 30).length, 0);
    });

    it('el último turno tiene que terminar dentro del tramo', () => {
        assert.deepEqual(turnosDe([{ desde: '09:00', hasta: '10:30' }], 60), ['09:00']);
        assert.deepEqual(turnosDe([{ desde: '09:15', hasta: '10:00' }], 15), ['09:15', '09:30', '09:45']);
    });
});

describe('Agenda: validación del horario', () => {
    it('acepta el horario de siempre', () => {
        assert.equal(validarHorario(copia()), null);
    });

    it('rechaza horas mal escritas, tramos que se pisan o que no alcanzan', () => {
        const h = copia();
        h.semana[2].tramos = [{ desde: '9:00', hasta: '12:00' }];
        assert.match(validarHorario(h), /09:30/);
        h.semana[2].tramos = [{ desde: '09:00', hasta: '12:00' }, { desde: '11:00', hasta: '13:00' }];
        assert.match(validarHorario(h), /se pisan/);
        h.semana[2].tramos = [{ desde: '09:00', hasta: '09:20' }];
        assert.match(validarHorario(h), /no alcanza/);
    });

    it('cada tramo tiene que terminar justo al final de un turno', () => {
        const h = { ...copia(), duracionMinutos: 45, semana: copia().semana.map(() => ({ tramos: [] })) };
        h.semana[1].tramos = [{ desde: '09:10', hasta: '12:00' }];
        assert.match(validarHorario(h), /terminar a las 11:25 o 12:10/);
        h.semana[1].tramos = [{ desde: '09:10', hasta: '11:25' }];
        assert.equal(validarHorario(h), null);
    });

    it('rechaza duraciones raras, semanas incompletas y todo cerrado', () => {
        assert.ok(validarHorario({ ...copia(), duracionMinutos: 20 }));
        assert.ok(validarHorario({ ...copia(), semana: copia().semana.slice(0, 6) }));
        assert.match(validarHorario({ ...copia(), semana: copia().semana.map(() => ({ tramos: [] })) }), /al menos un día/);
    });

    it('valida los días cerrados', () => {
        assert.equal(validarHorario({ ...copia(), cerrados: [{ desde: '2026-12-24', hasta: '2026-12-31', motivo: 'Vacaciones' }] }), null);
        assert.ok(validarHorario({ ...copia(), cerrados: [{ desde: '2026-02-30', hasta: '2026-03-01' }] }));
        assert.ok(validarHorario({ ...copia(), cerrados: [{ desde: '2026-12-31', hasta: '2026-12-24' }] }));
    });
});

describe('Agenda: texto del horario', () => {
    it('agrupa los días seguidos con el mismo horario', () => {
        assert.equal(textoHorario(HORARIO_INICIAL), 'Lunes a jueves de 9 a 13 y de 17 a 19 h · viernes de 9 a 13 h');
    });

    it('nombra dos días seguidos con "y" y muestra los minutos', () => {
        const h = copia();
        h.semana = h.semana.map(() => ({ tramos: [] }));
        h.semana[6].tramos = [{ desde: '09:30', hasta: '12:00' }];
        h.semana[0].tramos = [{ desde: '09:30', hasta: '12:00' }];
        assert.equal(textoHorario(h), 'Sábado y domingo de 9:30 a 12 h');
    });
});

describe('Agenda: días libres', () => {
    const ahora = { fecha: '2026-11-01', minutos: 600 };
    // 2026-11-02 es lunes
    it('un día cerrado no ofrece turnos', () => {
        const h = { ...copia(), cerrados: [{ desde: '2026-11-02', hasta: '2026-11-02', motivo: 'Feriado' }] };
        assert.deepEqual(libresDelDia('2026-11-02', new Map(), ahora, h).turnos, []);
        assert.equal(libresDelDia('2026-11-03', new Map(), ahora, h).turnos.length, 12);
    });

    it('con turnos de 60 min, una visita de las 9:30 ocupa también el turno de las 9', () => {
        const h = { ...copia(), duracionMinutos: 60 };
        const tomados = new Map([['2026-11-02', [570]]]);
        const { libres } = libresDelDia('2026-11-02', tomados, ahora, h);
        assert.ok(!libres.includes('09:00'));
        assert.ok(libres.includes('11:00'));
    });
});
