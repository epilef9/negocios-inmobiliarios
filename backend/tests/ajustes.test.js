// Ajustes del sitio: validación de contacto, costos, datos bancarios y preguntas del asistente. No usa base de datos.
// Correr solo este archivo:  node --test tests/ajustes.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { revisar, fusionar, PREDETERMINADOS, PREGUNTAS_SUGERIDAS, MAX_PREGUNTAS, bancoCompleto } = require('../src/services/ajustes.service');

describe('Ajustes: contacto', () => {
    it('limpia el WhatsApp y el usuario de Instagram', () => {
        const { cambio } = revisar({ contacto: { whatsapp: '+54 9 343 446-9522', instagram: '@mi.inmo' } });
        assert.equal(cambio['contacto.whatsapp'], '5493434469522');
        assert.equal(cambio['contacto.instagram'], 'mi.inmo');
    });

    it('rechaza email inválido, dirección vacía y horarios vacíos', () => {
        assert.match(revisar({ contacto: { email: 'no-es-mail' } }).error, /email/);
        assert.match(revisar({ contacto: { direccion: '   ' } }).error, /dirección/);
        assert.match(revisar({ contacto: { horarios: [{ dias: '', horas: '' }] } }).error, /horario/);
    });

    it('ignora campos desconocidos', () => {
        const { cambio } = revisar({ contacto: { telefono: '343 4469522', $where: 'x' }, otra: 1 });
        assert.deepEqual(Object.keys(cambio), ['contacto.telefono']);
    });
});

describe('Ajustes: costos y banco', () => {
    it('acepta porcentajes en rango y rechaza los demás', () => {
        assert.equal(revisar({ costos: { alquiler: { honorariosPorcentaje: 4.15 } } }).cambio['costos.alquiler.honorariosPorcentaje'], 4.15);
        assert.match(revisar({ costos: { venta: { escrituraPorcentaje: 50 } } }).error, /porcentajes/);
        assert.match(revisar({ costos: { venta: { honorariosPorcentaje: '3' } } }).error, /porcentajes/);
    });

    it('valida CBU, alias y CUIT', () => {
        assert.match(revisar({ banco: { cbu: '123' } }).error, /22/);
        assert.match(revisar({ banco: { alias: 'a b' } }).error, /alias/);
        assert.match(revisar({ banco: { cuit: '20-1234' } }).error, /11/);
        assert.equal(revisar({ banco: { cbu: '0000003100010000000001', alias: 'casa.sol.rio', cuit: '20-12345678-9' } }).error, undefined);
    });

    it('sin titular y sin CBU/alias no se ofrece transferencia', () => {
        assert.equal(bancoCompleto(PREDETERMINADOS.banco), false);
        assert.equal(bancoCompleto({ titular: 'Araceli', alias: 'casa.sol.rio' }), true);
    });

    it('lo guardado completa los predeterminados sin borrarlos', () => {
        const r = fusionar(PREDETERMINADOS, { contacto: { telefono: '1' }, costos: { alquiler: { selladoPorcentaje: 1 } } });
        assert.equal(r.contacto.telefono, '1');
        assert.equal(r.contacto.email, PREDETERMINADOS.contacto.email);
        assert.equal(r.costos.alquiler.selladoPorcentaje, 1);
        assert.equal(r.costos.alquiler.mesesDeposito, 1);
    });
});

describe('Ajustes: lugares de referencia', () => {
    it('acepta lugares con nombre y punto en Entre Ríos', () => {
        const { cambio } = revisar({ lugares: [{ nombre: 'Universidad', localidad: 'Libertador San Martín', latitud: -32.07, longitud: -60.46 }] });
        assert.equal(cambio.lugares.length, 1);
    });
    it('rechaza lugares sin nombre o fuera de la provincia', () => {
        assert.match(revisar({ lugares: [{ nombre: '', latitud: -32, longitud: -60 }] }).error, /nombre/);
        assert.match(revisar({ lugares: [{ nombre: 'Obelisco', latitud: -34.6, longitud: -58.38 }] }).error, /Entre Ríos/);
    });
});

describe('Ajustes: preguntas del asistente', () => {
    it('las sugeridas pasan su propia validación', () => {
        const { cambio, error } = revisar({ preguntas: PREGUNTAS_SUGERIDAS });
        assert.equal(error, undefined);
        assert.equal(cambio.preguntas.length, PREGUNTAS_SUGERIDAS.length);
    });

    it('sin nada guardado se usan las sugeridas; una lista vacía guardada se respeta', () => {
        assert.equal(fusionar(PREDETERMINADOS, {}).preguntas.length, PREGUNTAS_SUGERIDAS.length);
        assert.deepEqual(fusionar(PREDETERMINADOS, { preguntas: [] }).preguntas, []);
    });

    it('limpia las palabras clave y conserva los renglones de la respuesta', () => {
        const { cambio } = revisar({ preguntas: [{ pregunta: '  ¿Aceptan mascotas? ', respuesta: 'Depende\r\n\r\n\r\nde la propiedad', palabras: ['Mascotas', '', 'perro'] }] });
        assert.deepEqual(cambio.preguntas[0], { pregunta: '¿Aceptan mascotas?', respuesta: 'Depende\n\nde la propiedad', palabras: ['mascotas', 'perro'] });
    });

    it('pide pregunta y respuesta, y limita la cantidad', () => {
        assert.match(revisar({ preguntas: [{ pregunta: '', respuesta: 'x' }] }).error, /pregunta/);
        assert.match(revisar({ preguntas: [{ pregunta: 'x', respuesta: ' ' }] }).error, /respuesta/);
        const muchas = Array.from({ length: MAX_PREGUNTAS + 1 }, (_, i) => ({ pregunta: `p${i}`, respuesta: 'r' }));
        assert.match(revisar({ preguntas: muchas }).error, /hasta/);
    });

    it('el enlace solo puede ir a una página del sitio o a https', () => {
        const con = (href) => revisar({ preguntas: [{ pregunta: 'p', respuesta: 'r', enlace: { texto: 'Ver', href } }] });
        assert.equal(con('/requisitos?para=alquilar').error, undefined);
        assert.equal(con('https://wa.me/543434469522').error, undefined);
        for (const malo of ['javascript:alert(1)', '//otro.com', 'http://otro.com', 'data:text/html,x']) assert.match(con(malo).error, /enlace/);
        assert.match(revisar({ preguntas: [{ pregunta: 'p', respuesta: 'r', enlace: { texto: 'Ver' } }] }).error, /enlace/);
    });
});
