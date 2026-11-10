// Antes de las pruebas: deja la base de PRUEBA vacía con lo mínimo para recorrer el sitio
// (un administrador y una propiedad en alquiler que admite visitas y solicitudes).
// Usa los modelos del backend, así los datos tienen la misma forma que en el sitio.
const path = require('node:path');
const crypto = require('node:crypto');
const { uriDePrueba } = require('../backend/tests/base-de-prueba');

const backend = (ruta) => path.join(__dirname, '../backend', ruta);
const mongoose = require(backend('node_modules/mongoose'));

module.exports = async () => {
  const uri = uriDePrueba();
  // Datos que comparten las pruebas (los workers heredan estas variables)
  process.env.E2E_ADMIN_EMAIL = 'admin-e2e@example.com';
  process.env.E2E_ADMIN_CLAVE = `Admin-${crypto.randomBytes(6).toString('hex')}`;
  process.env.E2E_CLIENTE_EMAIL = `cliente-${Date.now()}@example.com`;
  process.env.E2E_CLIENTE_CLAVE = `Cliente-${crypto.randomBytes(6).toString('hex')}`;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  try {
    await mongoose.connection.dropDatabase();
    const User = require(backend('src/models/user.model'));
    const Property = require(backend('src/models/property.model'));
    const { normalizarOperaciones } = require(backend('src/services/properties.service'));

    await new User({
      nombre: 'Admin', apellido: 'E2E', email: process.env.E2E_ADMIN_EMAIL, nombreUsuario: 'admin-e2e',
      contrasena: process.env.E2E_ADMIN_CLAVE, rol: 'admin', activo: true, emailVerificado: true, aceptoTerminosEn: new Date(),
    }).save();

    const propiedad = await Property.create({
      ...normalizarOperaciones({
        titulo: 'Departamento de prueba E2E',
        descripcion: 'Departamento de dos ambientes usado por las pruebas de punta a punta.',
        ubicacion: 'Libertador San Martín, Entre Ríos',
        direccionCompleta: 'San Martín 100, Libertador San Martín',
        ciudad: 'Villa Libertador San Martín',
        provincia: 'entre_rios',
        latitud: '-32.0748',
        longitud: '-60.4577',
        categoriaOperacion: 'alquiler',
        tipoInmueble: 'departamento',
        moneda: 'ARS',
        precio: 300,
        precioARS: 420000,
        cotizacionDolar: 1400,
        ambientes: 2,
        dormitorios: 1,
        banos: 1,
        area: 48,
        estado: 'disponible',
        permitirVisita: true,
        permitirSolicitudes: true,
        permitirWhatsApp: true,
        expensas: 'sin_expensas',
      }),
      fotos: [],
      codigoInterno: 'E2E-1',
      orden: 1,
    });
    process.env.E2E_PROPIEDAD_ID = String(propiedad._id);
  } finally {
    await mongoose.disconnect();
  }
};
