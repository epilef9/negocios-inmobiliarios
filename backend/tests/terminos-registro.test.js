// Aceptar los Términos y la Política de privacidad al registrarse. No usa base de datos:
// el repositorio de usuarios se reemplaza por datos falsos.
// Correr solo este archivo:  node --test tests/terminos-registro.test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const userRepository = require('../src/repositories/users.repository');
const emailService = require('../src/services/email.service');
const authService = require('../src/services/auth.service');
const { validateRegister } = require('../src/validators/auth.validator');

afterEach(() => mock.restoreAll());

const datosValidos = (extra = {}) => ({
    nombre: 'Ana',
    apellido: 'Paz',
    email: 'ana@test.com',
    password: 'clave-segura-1',
    confirmPassword: 'clave-segura-1',
    ...extra,
});

// Corre el validador con un pedido falso y dice si dejó pasar o con qué respuesta cortó
const correrValidador = (body) => {
    let siguio = false;
    let respuesta = null;
    const res = {
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(cuerpo) {
            respuesta = { codigo: this.codigo, cuerpo };
        },
    };
    validateRegister({ body }, res, () => {
        siguio = true;
    });
    return { siguio, respuesta };
};

describe('Registro: validador', () => {
    it('rechaza el registro sin aceptar los términos', () => {
        const { siguio, respuesta } = correrValidador(datosValidos());
        assert.equal(siguio, false);
        assert.equal(respuesta.codigo, 400);
        assert.ok(respuesta.cuerpo.errors.some((e) => /Términos/.test(e)));
    });

    it('rechaza valores que no son exactamente true (texto, número, false)', () => {
        for (const valor of ['true', 1, false, null, 'on']) {
            assert.equal(correrValidador(datosValidos({ aceptoTerminos: valor })).siguio, false, `valor ${String(valor)}`);
        }
    });

    it('deja pasar el registro con los términos aceptados', () => {
        assert.equal(correrValidador(datosValidos({ aceptoTerminos: true })).siguio, true);
    });
});

describe('Registro: servicio', () => {
    it('sin aceptar los términos no crea la cuenta', async () => {
        const crear = mock.method(userRepository, 'createUser', async () => ({}));
        mock.method(userRepository, 'findByEmail', async () => null);
        await assert.rejects(() => authService.register(datosValidos()), { statusCode: 400, code: 'TERMINOS_NO_ACEPTADOS' });
        assert.equal(crear.mock.callCount(), 0);
    });

    it('guarda la fecha en que aceptó', async () => {
        mock.method(userRepository, 'findByEmail', async () => null);
        const crear = mock.method(userRepository, 'createUser', async (datos) => ({ _id: 'u1', ...datos }));
        mock.method(userRepository, 'updateUser', async () => ({}));
        mock.method(emailService, 'enviarVerificacion', async () => ({}));
        const antes = Date.now();
        await authService.register(datosValidos({ aceptoTerminos: true }));
        const guardado = crear.mock.calls[0].arguments[0];
        assert.ok(guardado.aceptoTerminosEn instanceof Date);
        assert.ok(guardado.aceptoTerminosEn.getTime() >= antes);
    });
});
