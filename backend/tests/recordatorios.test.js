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

describe('Menú del panel', () => {
    const panelRoutes = require('../src/routes/panel.routes');
    const User = require('../src/models/user.model');
    const { limpiarMenu } = panelRoutes;
    // Último paso de PUT /menu (después de los controles de sesión)
    const guardar = panelRoutes.stack.find((capa) => capa.route?.path === '/menu' && capa.route.methods.put).route.stack.at(-1).handle;
    const pedir = async (body) => {
        const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(c) { this.cuerpo = c; return this; } };
        await guardar({ user: { _id: 'u1' }, body }, res);
        return res;
    };

    it('limpia las claves y corta en 30', () => {
        assert.deepEqual(limpiarMenu(['visitas', 'visitas', 'Mal Clave', null, 'cobros']), ['visitas', 'cobros']);
        assert.equal(limpiarMenu(Array.from({ length: 40 }, (_, i) => `s${i}`)).length, 30);
        assert.equal(limpiarMenu({ visitas: true }), null);
    });

    it('guarda la lista en la cuenta, null vuelve al de siempre y rechaza lo que no es lista', async () => {
        const original = User.updateOne;
        const cambios = [];
        User.updateOne = async (filtro, cambio) => cambios.push([filtro, cambio]);
        try {
            const ok = await pedir({ menu: ['visitas', 'cobros'] });
            assert.equal(ok.codigo, 200);
            assert.deepEqual(ok.cuerpo.data, ['visitas', 'cobros']);
            assert.deepEqual(cambios[0][1].$set['preferencias.menu'], ['visitas', 'cobros']);

            const deSiempre = await pedir({ menu: null });
            assert.equal(deSiempre.codigo, 200);
            assert.deepEqual(cambios[1][1].$unset, { 'preferencias.menu': 1 });

            const mal = await pedir({ menu: 'visitas' });
            assert.equal(mal.codigo, 400);
            assert.equal(cambios.length, 2, 'lo inválido no se guarda');
        } finally {
            User.updateOne = original;
        }
    });

    it('las rutas del menú piden sesión del personal del panel', () => {
        const auth = require('../src/middlewares/auth.middleware');
        for (const metodo of ['get', 'put']) {
            const ruta = panelRoutes.stack.find((capa) => capa.route?.path === '/menu' && capa.route.methods[metodo]);
            assert.ok(ruta.route.stack.some((capa) => capa.handle === auth.requirePersonal), `${metodo.toUpperCase()} /menu`);
        }
    });
});
