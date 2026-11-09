// Base de DEMO para presentar el sitio con datos de muestra, sin tocar la base real.
// Toma la dirección de MONGODB_URI_DEMO y se niega a usarla si:
//   - no está definida,
//   - es igual a la base real (MONGODB_URI / DB_URI), o
//   - el nombre de la base no incluye "demo" o "test" (por ejemplo inmobiliaria_demo).
// Es el mismo control que tests/base-de-prueba.js, para que un script que borra todo no pueda borrar la real.

const nombreDeBase = (uri) => {
    try {
        return new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, '');
    } catch {
        return '';
    }
};

const uriDemo = () => {
    const uri = process.env.MONGODB_URI_DEMO;
    if (!uri) {
        throw new Error('Falta MONGODB_URI_DEMO en backend/.env: la dirección de una base aparte para la demo (por ejemplo …mongodb.net/inmobiliaria_demo). No se usa MONGODB_URI para no tocar la base real.');
    }
    const real = process.env.MONGODB_URI || process.env.DB_URI;
    if (real && uri.trim() === real.trim()) {
        throw new Error('MONGODB_URI_DEMO no puede ser la misma base que MONGODB_URI.');
    }
    if (!/demo|test/i.test(nombreDeBase(uri))) {
        throw new Error('El nombre de la base de MONGODB_URI_DEMO tiene que incluir "demo" o "test" (por ejemplo inmobiliaria_demo).');
    }
    return uri;
};

module.exports = { uriDemo, nombreDeBase };
