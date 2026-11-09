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

// Estadísticas para quien publicó la propiedad (Mi cuenta → Tus publicaciones)
const { armarDeDueno, propiasDe } = require('../src/services/estadisticas.service');
describe('Estadísticas del dueño', () => {
    const casa = { _id: '64b7f0c2a1b2c3d4e5f60718', titulo: 'Casa con jardín', estado: 'disponible', categoriaOperacion: 'venta', operaciones: ['venta', 'alquiler'], fotos: ['f.jpg'] };
    const depto = { _id: '64b7f0c2a1b2c3d4e5f60719', titulo: 'Depto céntrico', categoriaOperacion: 'alquiler', fotos: [] };
    const fila = (id, dia, datos) => ({ _id: { propiedad: id, dia }, ...datos });

    it('suma cada propiedad por separado y arma las vistas día por día', () => {
        const r = armarDeDueno([casa, depto], [
            fila(casa._id, '2026-11-08', { vistas: 10, whatsapp: 2, favoritos: 1 }),
            fila(casa._id, '2026-11-10', { vistas: 5, visitas: 1 }),
            fila(depto._id, '2026-11-10', { vistas: 3, solicitudes: 1 }),
        ], { desde: '2026-11-04', hasta: '2026-11-10', dias: 7 });
        const [c, d] = r.propiedades;
        assert.deepEqual([c.vistas, c.whatsapp, c.visitas, c.favoritos, c.solicitudes], [15, 2, 1, 1, 0]);
        assert.deepEqual(c.operaciones, ['venta', 'alquiler']);
        assert.equal(c.serie.length, 7);
        assert.deepEqual(c.serie.map((x) => x.vistas), [0, 0, 0, 0, 10, 0, 5]);
        assert.equal(d.vistas, 3);
        assert.equal(r.totales.vistas, 18);
        assert.equal(r.totales.solicitudes, 1);
    });

    it('no devuelve datos de quién miró: solo números', () => {
        const r = armarDeDueno([casa], [fila(casa._id, '2026-11-10', { vistas: 1 })], { desde: '2026-11-10', hasta: '2026-11-10', dias: 1 });
        assert.deepEqual(Object.keys(r.propiedades[0]).sort(), ['estado', 'favoritos', 'foto', 'id', 'operaciones', 'serie', 'solicitudes', 'titulo', 'visitas', 'vistas', 'whatsapp']);
    });

    it('sin un usuario válido no busca nada', async () => {
        assert.deepEqual(await propiasDe('no-es-id'), []);
    });
});
