// Control de la base de demo (npm run demo:base la borra entera): nunca puede ser la real.
// No usa base de datos. Correr solo este archivo:  node --test tests/base-demo.test.js
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { uriDemo } = require('../src/utils/base-demo');

const antes = { demo: process.env.MONGODB_URI_DEMO, real: process.env.MONGODB_URI };
afterEach(() => {
    process.env.MONGODB_URI_DEMO = antes.demo ?? '';
    if (antes.demo === undefined) delete process.env.MONGODB_URI_DEMO;
    process.env.MONGODB_URI = antes.real ?? '';
    if (antes.real === undefined) delete process.env.MONGODB_URI;
});

describe('Base de demo', () => {
    it('acepta una base aparte con «demo» o «test» en el nombre', () => {
        process.env.MONGODB_URI = 'mongodb+srv://u:p@cluster.example.net/inmobiliaria_db';
        process.env.MONGODB_URI_DEMO = 'mongodb+srv://u:p@cluster.example.net/inmobiliaria_demo?retryWrites=true';
        assert.equal(uriDemo(), process.env.MONGODB_URI_DEMO);
        process.env.MONGODB_URI_DEMO = 'mongodb://localhost:27017/inmobiliaria_test';
        assert.equal(uriDemo(), process.env.MONGODB_URI_DEMO);
    });

    it('se niega sin variable, con la base real o con un nombre que no dice demo', () => {
        delete process.env.MONGODB_URI_DEMO;
        assert.throws(uriDemo, /MONGODB_URI_DEMO/);
        process.env.MONGODB_URI = 'mongodb://localhost:27017/inmobiliaria_demo';
        process.env.MONGODB_URI_DEMO = 'mongodb://localhost:27017/inmobiliaria_demo';
        assert.throws(uriDemo, /misma base/);
        process.env.MONGODB_URI = 'mongodb://localhost:27017/inmobiliaria_db';
        process.env.MONGODB_URI_DEMO = 'mongodb://localhost:27017/inmobiliaria_db2';
        assert.throws(uriDemo, /demo/);
        // «demo» en el usuario o el host no cuenta: tiene que estar en el nombre de la base
        process.env.MONGODB_URI_DEMO = 'mongodb://demo:clave@demo.example.net/inmobiliaria';
        assert.throws(uriDemo, /demo/);
    });
});
