// Usuarios del panel con permisos y registro de actividad. No usa base de datos:
// User.findById y el guardado de la actividad se reemplazan por datos falsos y se usa el middleware y las rutas reales.
// Correr solo este archivo:  node --test tests/permisos-panel.test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const actividadService = require('../src/services/actividad.service');
const permisos = require('../src/utils/permisos');
const { registra } = require('../src/middlewares/actividad');
const { permitidoEnResumen } = require('../src/routes/panel.routes');

const usuarios = {};
const originalFindById = User.findById;
const originalRegistrar = actividadService.registrar;
afterEach(() => {
    User.findById = originalFindById;
    actividadService.registrar = originalRegistrar;
});

const hacerUsuario = (extra) => ({ _id: 'u-' + Math.random().toString(36).slice(2), email: 'x@test.com', nombre: 'Ana', apellido: 'Paz', emailVerificado: true, ...extra });
const tokenDe = (user) => jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

let servidor;
let base;
before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', require('../src/routes'));
    servidor = app.listen(0);
    base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => servidor.close());

const pedir = async (ruta, user, { metodo = 'GET' } = {}) => {
    User.findById = async () => user;
    const r = await fetch(base + ruta, { method: metodo, headers: { Authorization: `Bearer ${tokenDe(user)}`, 'Content-Type': 'application/json' }, body: metodo === 'GET' ? undefined : '{}' });
    return { status: r.status, cuerpo: await r.json().catch(() => ({})) };
};

describe('Permisos por sección (utils)', () => {
    it('el admin tiene todos los permisos', () => {
        for (const { clave } of permisos.SECCIONES) assert.equal(permisos.tienePermiso({ rol: 'admin' }, clave), true);
    });

    it('el empleado solo tiene los que se le dieron', () => {
        const e = { rol: 'empleado', permisos: ['visitas', 'propiedades'] };
        assert.equal(permisos.tienePermiso(e, 'visitas'), true);
        assert.equal(permisos.tienePermiso(e, 'propiedades'), true);
        assert.equal(permisos.tienePermiso(e, 'contratos'), false);
        assert.equal(permisos.tienePermiso({ rol: 'empleado' }, 'visitas'), false);
    });

    it('un empleado dado de baja o un cliente no tienen permisos', () => {
        assert.equal(permisos.tienePermiso({ rol: 'empleado', activo: false, permisos: ['visitas'] }, 'visitas'), false);
        assert.equal(permisos.tienePermiso({ rol: 'cliente', permisos: ['visitas'] }, 'visitas'), false);
    });

    it('limpia permisos inventados y repetidos', () => {
        assert.deepEqual(permisos.limpiarPermisos(['visitas', 'visitas', 'hackear', 5, null]), ['visitas']);
        assert.deepEqual(permisos.limpiarPermisos('visitas'), []);
    });
});

describe('Un empleado sin permiso recibe 403 en la API aunque escriba la dirección a mano', () => {
    const empleado = () => hacerUsuario({ rol: 'empleado', permisos: ['visitas', 'propiedades'] });

    for (const ruta of ['/contratos', '/cobros', '/clients', '/estadisticas', '/senas', '/requisitos/admin', '/solicitudes/admin', '/solicitudes-publicacion', '/reservas', '/disponibilidad/abc/rangos']) {
        it(`GET ${ruta}`, async () => {
            const { status } = await pedir(ruta, empleado());
            assert.equal(status, 403, `${ruta} tendría que dar 403`);
        });
    }

    it('contratos también rechaza escribir (POST)', async () => {
        const { status } = await pedir('/contratos', empleado(), { metodo: 'POST' });
        assert.equal(status, 403);
    });

    it('no puede crear ni modificar propiedades sin ese permiso', async () => {
        const sin = hacerUsuario({ rol: 'empleado', permisos: ['visitas'] });
        assert.equal((await pedir('/properties', sin, { metodo: 'POST' })).status, 403);
    });

    it('lo que es solo del administrador (empleados, actividad general, ajustes) también da 403', async () => {
        for (const ruta of ['/empleados', '/actividad', '/ajustes/admin']) {
            const { status } = await pedir(ruta, empleado());
            assert.equal(status, 403, ruta);
        }
    });

    it('un cliente tampoco entra a una sección del panel', async () => {
        assert.equal((await pedir('/contratos', hacerUsuario({ rol: 'cliente' }))).status, 403);
    });

    it('la actividad de una sección sin permiso da 403; la de una con permiso pasa el control de permisos', async () => {
        assert.equal((await pedir('/actividad/solicitud/abc', empleado())).status, 403);
        actividadService.deUnaEntidad = async () => [];
        assert.equal((await pedir('/actividad/visita/abc', empleado())).status, 200);
    });

    it('un empleado dado de baja queda fuera con la sesión que tenía', async () => {
        const baja = hacerUsuario({ rol: 'empleado', activo: false, permisos: ['visitas'] });
        const { status, cuerpo } = await pedir('/visitas', baja);
        assert.equal(status, 401);
        assert.equal(cuerpo.code, 'CUENTA_DESACTIVADA');
    });
});

describe('Resumen del inicio: cada uno ve solo lo suyo', () => {
    const empleado = { rol: 'empleado', permisos: ['visitas'] };
    it('filtra por la sección a la que lleva cada ítem', () => {
        assert.equal(permitidoEnResumen(empleado, { href: '/admin/visitas' }), true);
        assert.equal(permitidoEnResumen(empleado, { href: '/admin/contratos' }), false);
        assert.equal(permitidoEnResumen(empleado, { href: '/admin/sitio' }), false);
        assert.equal(permitidoEnResumen({ rol: 'admin' }, { href: '/admin/sitio' }), true);
    });
});

describe('Registro de actividad', () => {
    const levantar = async (ruta, manejador) => {
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => { req.user = hacerUsuario({ rol: 'admin', nombre: 'Araceli', apellido: 'B' }); next(); });
        app.patch('/visitas/:id', registra('visita', (req) => `Confirmada`), manejador);
        const s = app.listen(0);
        const r = await fetch(`http://127.0.0.1:${s.address().port}${ruta}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        await new Promise((resolve) => setTimeout(resolve, 20));
        s.close();
        return r.status;
    };

    it('guarda quién, qué y sobre qué cuando la acción sale bien', async () => {
        const guardados = [];
        actividadService.registrar = async (user, datos) => guardados.push({ nombre: user.nombre, ...datos });
        assert.equal(await levantar('/visitas/v123', (_req, res) => res.json({ ok: true })), 200);
        assert.equal(guardados.length, 1);
        assert.deepEqual(guardados[0], { nombre: 'Araceli', entidad: 'visita', entidadId: 'v123', accion: 'Confirmada', detalle: undefined });
    });

    it('no guarda nada si la acción falla', async () => {
        const guardados = [];
        actividadService.registrar = async (...a) => guardados.push(a);
        assert.equal(await levantar('/visitas/v123', (_req, res) => res.status(409).json({ message: 'no' })), 409);
        assert.equal(guardados.length, 0);
    });

    it('registrar nunca rompe: si no se puede guardar devuelve null', async () => {
        const Actividad = require('../src/models/actividad.model');
        const original = Actividad.create;
        Actividad.create = async () => { throw new Error('base caída'); };
        const silenciar = console.error;
        console.error = () => {};
        try {
            assert.equal(await originalRegistrar({ _id: 'u', nombre: 'A', rol: 'admin' }, { entidad: 'visita', entidadId: '1', accion: 'Confirmada' }), null);
        } finally {
            Actividad.create = original;
            console.error = silenciar;
        }
    });
});
