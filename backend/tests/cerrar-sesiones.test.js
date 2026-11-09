// Cerrar sesión en todos los dispositivos. No usa base de datos: se reemplaza User.findById.
// Correr solo este archivo:  node --test tests/cerrar-sesiones.test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const authService = require('../src/services/auth.service');

const original = User.findById;
afterEach(() => {
    User.findById = original;
});

const usuario = (extra = {}) => ({
    _id: 'u1',
    email: 'cliente@test.com',
    rol: 'cliente',
    nombre: 'Ana',
    apellido: 'Paz',
    guardado: false,
    async save() {
        this.guardado = true;
    },
    ...extra,
});

describe('cerrarSesiones', () => {
    it('actualiza credencialesCambiadasEn y devuelve una sesión nueva que sigue valiendo', async () => {
        const user = usuario();
        User.findById = async () => user;
        const antes = Date.now();
        const { token, user: datos } = await authService.cerrarSesiones('u1');

        assert.equal(user.guardado, true);
        assert.ok(user.credencialesCambiadasEn.getTime() >= antes);
        assert.equal(datos.email, 'cliente@test.com');
        // La regla del middleware: la sesión se rechaza si credencialesCambiadasEn (en segundos) es posterior a su iat
        const { iat } = jwt.decode(token);
        assert.ok(Math.floor(user.credencialesCambiadasEn.getTime() / 1000) <= iat);
    });

    it('una sesión iniciada antes queda fuera', async () => {
        const user = usuario();
        User.findById = async () => user;
        const iatViejo = Math.floor(Date.now() / 1000) - 60;
        await authService.cerrarSesiones('u1');
        assert.ok(Math.floor(user.credencialesCambiadasEn.getTime() / 1000) > iatViejo);
    });

    it('con una cuenta que no existe responde 404', async () => {
        User.findById = async () => null;
        await assert.rejects(() => authService.cerrarSesiones('nadie'), { statusCode: 404 });
    });
});
