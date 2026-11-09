// Estadísticas (222): fechas en hora de Argentina y eventos permitidos. No usa base de datos.
// Correr solo este archivo:  node --test tests/estadisticas.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hoyArgentina, restarDias, EVENTOS_PUBLICOS, registrarEvento } = require('../src/services/estadisticas.service');

describe('Estadísticas', () => {
    it('el día se cuenta en hora de Argentina (UTC-3)', () => {
        assert.equal(hoyArgentina(new Date('2026-11-10T02:30:00Z')), '2026-11-09');
        assert.equal(hoyArgentina(new Date('2026-11-10T03:30:00Z')), '2026-11-10');
    });

    it('resta días cruzando meses', () => {
        assert.equal(restarDias('2026-03-01', 1), '2026-02-28');
        assert.equal(restarDias('2026-11-10', 29), '2026-10-12');
    });

    it('el navegador solo puede contar vistas y clics en WhatsApp', async () => {
        assert.deepEqual(Object.keys(EVENTOS_PUBLICOS).sort(), ['vista', 'whatsapp']);
        assert.equal(await registrarEvento('64b7f0c2a1b2c3d4e5f60718', 'solicitudes'), false);
        assert.equal(await registrarEvento('no-es-id', 'vista'), false);
    });
});

// 224: descripción del navegador en el aviso de ingreso
const { describirNavegador, huellaDe } = require('../src/services/avisoIngreso.service');
describe('Aviso de ingreso', () => {
    it('describe navegador y sistema', () => {
        assert.equal(describirNavegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'Chrome en Windows');
        assert.equal(describirNavegador('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari en iPhone');
        assert.equal(describirNavegador(''), 'un navegador');
    });
    it('guarda una huella, no el valor de la cookie', () => {
        assert.equal(huellaDe('abc').length, 64);
        assert.notEqual(huellaDe('abc'), 'abc');
    });
});
