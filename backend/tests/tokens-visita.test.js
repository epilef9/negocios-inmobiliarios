// Enlaces de los mails de una visita (gestionar, confirmar asistencia). No usa base de datos: las consultas a
// Mongo se reemplazan por datos falsos.
// Correr solo este archivo:  node --test tests/tokens-visita.test.js
const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const TokenVisita = require('../src/models/tokenVisita.model');
const Visita = require('../src/models/visita.model');
const tokensVisita = require('../src/services/tokensVisita.service');
const visitasService = require('../src/services/visitas.service');

const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');
const TOKEN = 'ab'.repeat(32);
const FUTURA = { _id: 'v1', fecha: '05/11/2099', horario: '10:30 h', estado: 'pendiente', cliente: { nombre: 'Ana' }, propiedad: { titulo: 'Casa' } };

// Simula la base: el registro del token (o null) y la visita a la que apunta
const simularBase = ({ registro = null, visita = FUTURA } = {}) => {
    const findOne = mock.method(TokenVisita, 'findOne', () => ({ lean: async () => registro }));
    mock.method(Visita, 'findById', async () => visita);
    return { findOne };
};

afterEach(() => mock.restoreAll());

describe('Tokens de visita: vencimiento', () => {
    it('vence cuando empieza la visita, en hora de Argentina', () => {
        const esperado = '2026-11-05T13:30:00.000Z';
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '05/11/2026', horario: '10:30 h' }).toISOString(), esperado);
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '2026-11-05', horario: '10:30' }).toISOString(), esperado);
    });

    it('sin una fecha u horario que se entiendan no hay vencimiento', () => {
        assert.equal(tokensVisita.inicioDeVisita({ fecha: 'mañana', horario: '10:30' }), null);
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '05/11/2026', horario: 'a la tarde' }), null);
    });
});

describe('Tokens de visita: emitir', () => {
    it('no emite enlace para una visita que ya pasó', async () => {
        const crear = mock.method(TokenVisita, 'create', async () => {});
        mock.method(TokenVisita, 'deleteMany', async () => {});
        assert.equal(await tokensVisita.emitir({ ...FUTURA, fecha: '05/11/2020' }, 'gestion'), null);
        assert.equal(crear.mock.callCount(), 0);
    });

    it('guarda solo el hash: el token del mail no queda en la base', async () => {
        const crear = mock.method(TokenVisita, 'create', async () => {});
        const anular = mock.method(TokenVisita, 'deleteMany', async () => {});
        const token = await tokensVisita.emitir(FUTURA, 'gestion');
        assert.match(token, /^[a-f0-9]{64}$/);
        const guardado = crear.mock.calls[0].arguments[0];
        assert.equal(guardado.hash, hashDe(token));
        assert.ok(!JSON.stringify(guardado).includes(token));
        assert.equal(guardado.estadoAlEmitir, 'pendiente');
        // Los enlaces anteriores del mismo propósito se anulan
        assert.deepEqual(anular.mock.calls[0].arguments[0], { visita: 'v1', proposito: 'gestion' });
    });
});

describe('Tokens de visita: validar', () => {
    it('rechaza tokens mal formados sin consultar la base', async () => {
        const { findOne } = simularBase();
        for (const token of ['', 'abc', 'zz'.repeat(32), TOKEN.toUpperCase(), 123, null, { $gt: '' }]) {
            assert.equal(await tokensVisita.validar(token, 'gestion'), null, String(token));
        }
        assert.equal(findOne.mock.callCount(), 0);
    });

    it('acepta un token vigente y busca por su hash', async () => {
        const { findOne } = simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' } });
        const valido = await tokensVisita.validar(TOKEN, 'gestion');
        assert.equal(valido.visita, FUTURA);
        assert.equal(findOne.mock.calls[0].arguments[0].hash, hashDe(TOKEN));
    });

    it('se anula si la visita cambió de estado', async () => {
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita: { ...FUTURA, estado: 'confirmada' } });
        assert.equal(await tokensVisita.validar(TOKEN, 'gestion'), null);
    });
});

describe('Tokens de visita: un solo uso', () => {
    it('consumir gana una sola vez', async () => {
        let usado = false;
        mock.method(TokenVisita, 'updateOne', async () => {
            const gano = !usado;
            usado = true;
            return { modifiedCount: gano ? 1 : 0 };
        });
        assert.equal(await tokensVisita.consumir({ _id: 't1' }), true);
        assert.equal(await tokensVisita.consumir({ _id: 't1' }), false);
    });
});

describe('Gestionar la visita: enlaces que no sirven', () => {
    it('inexistente, mal formado o anulado responden igual (no se revela si el token existe)', async () => {
        simularBase({ registro: null });
        const inexistente = await visitasService.verPorToken(TOKEN);
        const malFormado = await visitasService.verPorToken('cualquiera');
        mock.restoreAll();
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita: { ...FUTURA, estado: 'cancelada' } });
        const anulado = await visitasService.verPorToken(TOKEN);
        for (const respuesta of [malFormado, anulado]) assert.deepEqual(respuesta, inexistente);
        assert.equal(inexistente.status, 404);
    });

    it('un enlace vigente muestra la visita sin teléfono ni email', async () => {
        const visita = { ...FUTURA, cliente: { nombre: 'Ana Pérez', telefono: '1155550000', email: 'ana@example.com' } };
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita });
        const { visita: vista } = await visitasService.verPorToken(TOKEN);
        assert.equal(vista.nombre, 'Ana');
        assert.equal(vista.fecha, '2099-11-05');
        assert.equal(vista.horario, '10:30');
        assert.ok(!JSON.stringify(vista).includes('1155550000') && !JSON.stringify(vista).includes('ana@example.com'));
    });
});

describe('Confirmar asistencia desde el recordatorio', () => {
    const visitasRepository = require('../src/repositories/visitas.repository');
    const emailService = require('../src/services/email.service');
    const REGISTRO = { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente', unSoloUso: true };

    // Base simulada para responder: el enlace se puede usar `usos` veces y se guarda lo que se actualiza
    const prepararRespuesta = ({ usos = 1 } = {}) => {
        simularBase({ registro: REGISTRO });
        let restantes = usos;
        mock.method(TokenVisita, 'updateOne', async () => ({ modifiedCount: restantes-- > 0 ? 1 : 0 }));
        const anular = mock.method(TokenVisita, 'deleteMany', async () => {});
        const actualizar = mock.method(visitasRepository, 'updateVisita', async (_id, datos) => ({ ...FUTURA, ...datos }));
        const avisar = mock.method(emailService, 'avisarInmobiliaria', async () => {});
        return { actualizar, anular, avisar };
    };

    it('"Confirmo" registra la respuesta sin cambiar el estado de la visita', async () => {
        const { actualizar, avisar } = prepararRespuesta();
        const { visita } = await visitasService.responderAsistencia(TOKEN, 'confirmo');
        const datos = actualizar.mock.calls[0].arguments[1];
        assert.equal(datos.asistencia.respuesta, 'confirmo');
        assert.equal(datos.estado, undefined);
        assert.equal(visita.estado, 'pendiente');
        assert.equal(avisar.mock.callCount(), 0);
    });

    it('"No voy a poder" cancela la visita, anula sus enlaces y avisa a la inmobiliaria', async () => {
        const { actualizar, anular, avisar } = prepararRespuesta();
        const { visita } = await visitasService.responderAsistencia(TOKEN, 'no_voy');
        const datos = actualizar.mock.calls[0].arguments[1];
        assert.equal(datos.estado, 'cancelada');
        assert.equal(datos.asistencia.respuesta, 'no_voy');
        assert.equal(visita.estado, 'cancelada');
        assert.deepEqual(anular.mock.calls[0].arguments[0], { visita: 'v1' });
        assert.match(avisar.mock.calls[0].arguments[0].intro, /recordatorio/);
    });

    it('el enlace sirve una sola vez', async () => {
        prepararRespuesta({ usos: 1 });
        assert.ok((await visitasService.responderAsistencia(TOKEN, 'confirmo')).visita);
        const segunda = await visitasService.responderAsistencia(TOKEN, 'confirmo');
        assert.equal(segunda.status, 404);
    });

    it('una respuesta que no es "confirmo" ni "no_voy" se rechaza sin tocar nada', async () => {
        const { actualizar } = prepararRespuesta();
        const respuesta = await visitasService.responderAsistencia(TOKEN, 'tal vez');
        assert.equal(respuesta.status, 400);
        assert.equal(actualizar.mock.callCount(), 0);
    });

    it('un enlace que no sirve responde el mismo 404 que gestionar la visita', async () => {
        simularBase({ registro: null });
        const asistencia = await visitasService.responderAsistencia(TOKEN, 'confirmo');
        const gestion = await visitasService.verPorToken(TOKEN);
        assert.deepEqual(asistencia, gestion);
    });
});
