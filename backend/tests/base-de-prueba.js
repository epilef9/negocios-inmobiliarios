// Los tests que usan MongoDB solo pueden correr contra una base de PRUEBA, nunca contra la real.
// Toman la dirección de MONGODB_URI_TEST (no de MONGODB_URI) y se cancelan si:
//   - MONGODB_URI_TEST no está definida,
//   - es igual a la base real (MONGODB_URI / DB_URI), o
//   - el nombre de la base no incluye "test" (por ejemplo mongodb://localhost:27017/inmobiliaria_test).
// Así un test que limpia colecciones (deleteMany) no puede borrar los datos del sitio.

const nombreDeBase = (uri) => {
    try {
        return new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, '');
    } catch {
        return '';
    }
};

const uriDePrueba = () => {
    const uri = process.env.MONGODB_URI_TEST;
    if (!uri) {
        throw new Error('Este test necesita MONGODB_URI_TEST con una base de prueba (por ejemplo mongodb://localhost:27017/inmobiliaria_test). No se usa MONGODB_URI para no tocar la base real.');
    }
    const real = process.env.MONGODB_URI || process.env.DB_URI;
    if (real && uri.trim() === real.trim()) {
        throw new Error('MONGODB_URI_TEST no puede ser la misma base que MONGODB_URI.');
    }
    if (!/test/i.test(nombreDeBase(uri))) {
        throw new Error('El nombre de la base de MONGODB_URI_TEST tiene que incluir "test" (por ejemplo inmobiliaria_test).');
    }
    return uri;
};

module.exports = { uriDePrueba };
