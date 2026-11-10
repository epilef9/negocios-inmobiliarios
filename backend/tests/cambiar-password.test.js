// HU-31: cambiar la contraseña desde Mi cuenta escribiendo la actual. No usa base de datos: se reemplaza User.findById.
// Correr solo este archivo:  node --test tests/cambiar-password.test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { describe, it, afterEach, before } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const emailService = require('../src/services/email.service');
const authService = require('../src/services/auth.service');

const originales = { findById: User.findById, aviso: emailService.avisarPasswordCambiada };
let avisos = 0;
afterEach(() => {
    User.findById = originales.findById;
    emailService.avisarPasswordCambiada = originales.aviso;
});

let hashActual;
before(async () => {
    hashActual = await bcrypt.hash('clave-actual-1', 4);
});

const usuario = () => ({
    _id: 'u1', email: 'cliente@test.com', rol: 'cliente', nombre: 'Ana', apellido: 'Paz', contrasena: hashActual,
    guardado: false,
    async save() { this.guardado = true; },
});
const preparar = () => {
    const user = usuario();
    User.findById = async () => user;
    avisos = 0;
    emailService.avisarPasswordCambiada = async () => { avisos += 1; };
    return user;
};
const falla = (promesa, code) => assert.rejects(promesa, (e) => e.code === code && e.statusCode === 400);

describe('Cambiar la contraseña con la actual (HU-31)', () => {
    it('con la actual correcta guarda la nueva cifrada, cierra las otras sesiones y avisa por mail', async () => {
        const user = preparar();
        const antes = Date.now();
        const { token } = await authService.cambiarPassword('u1', 'clave-actual-1', 'clave-nueva-22');
        assert.equal(user.guardado, true);
        assert.notEqual(user.contrasena, 'clave-nueva-22');
        assert.ok(await bcrypt.compare('clave-nueva-22', user.contrasena));
        assert.ok(user.credencialesCambiadasEn.getTime() >= antes);
        // La sesión nueva sigue valiendo con la regla del middleware
        assert.ok(Math.floor(user.credencialesCambiadasEn.getTime() / 1000) <= jwt.decode(token).iat);
        assert.equal(avisos, 1);
    });

    it('con la actual equivocada no cambia nada', async () => {
        const user = preparar();
        await falla(authService.cambiarPassword('u1', 'otra-cosa', 'clave-nueva-22'), 'PASSWORD_ACTUAL');
        assert.equal(user.guardado, false);
        assert.equal(avisos, 0);
    });

    it('pide la actual y una nueva de 8 a 72 caracteres, distinta de la actual', async () => {
        preparar();
        await falla(authService.cambiarPassword('u1', '', 'clave-nueva-22'), 'PASSWORD_ACTUAL');
        await falla(authService.cambiarPassword('u1', 'clave-actual-1', 'corta'), 'PASSWORD_INVALIDA');
        await falla(authService.cambiarPassword('u1', 'clave-actual-1', 'x'.repeat(73)), 'PASSWORD_INVALIDA');
        await falla(authService.cambiarPassword('u1', 'clave-actual-1', 'clave-actual-1'), 'PASSWORD_REPETIDA');
    });
});
