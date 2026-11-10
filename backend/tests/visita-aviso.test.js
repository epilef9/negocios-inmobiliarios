// HU-06: cuando alguien pide una visita desde el sitio, la inmobiliaria recibe un mail. No usa base de datos.
// Correr solo este archivo:  node --test tests/visita-aviso.test.js
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const emailService = require('../src/services/email.service');
const visitas = require('../src/services/visitas.service');

const original = emailService.avisarInmobiliaria;
after(() => { emailService.avisarInmobiliaria = original; });

const visita = { cliente: { nombre: 'Lucía Gómez', telefono: '343 555 1234', email: 'lucia@example.com' }, propiedad: { titulo: 'Casa en Crespo' }, fecha: '2026-11-12', horario: '10:30', notaAdicional: 'Vamos dos personas' };

test('manda el aviso con los datos de la visita y el enlace al panel', async () => {
    let enviado = null;
    emailService.avisarInmobiliaria = async (datos) => { enviado = datos; };
    await visitas.avisarPedido(visita);
    assert.match(enviado.asunto, /Casa en Crespo/);
    const filas = Object.fromEntries(enviado.filas);
    assert.equal(filas.Cliente, 'Lucía Gómez');
    assert.equal(filas['Día y hora'], '2026-11-12 · 10:30');
    assert.equal(filas.Nota, 'Vamos dos personas');
    assert.match(enviado.enlace, /\/admin\/visitas$/);
});

test('si el mail falla, no corta el pedido de la visita', async () => {
    emailService.avisarInmobiliaria = async () => { throw new Error('sin servidor de mail'); };
    const errorOriginal = console.error;
    console.error = () => {};
    try {
        await assert.doesNotReject(visitas.avisarPedido(visita));
    } finally {
        console.error = errorOriginal;
    }
});
