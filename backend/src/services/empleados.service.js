const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { limpiarPermisos, PERMISOS_POR_DEFECTO } = require('../utils/permisos');

const errorHttp = (mensaje, statusCode = 400) => Object.assign(new Error(mensaje), { statusCode });
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publico = (u) => ({
    id: String(u._id),
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email,
    telefono: u.telefono || '',
    permisos: u.permisos || [],
    activo: u.activo !== false,
    createdAt: u.createdAt,
});

const texto = (valor, nombre, { obligatorio = true, max = 80 } = {}) => {
    const t = typeof valor === 'string' ? valor.trim() : '';
    if (!t && obligatorio) throw errorHttp(`${nombre} es obligatorio.`);
    if (t.length > max) throw errorHttp(`${nombre} es demasiado largo.`);
    return t;
};

const validarClave = (clave) => {
    if (typeof clave !== 'string' || clave.length < 8 || clave.length > 128) throw errorHttp('La contraseña tiene que tener al menos 8 caracteres.');
};

const listar = async () => (await User.find({ rol: 'empleado' }).sort({ activo: -1, nombre: 1 }).lean()).map(publico);

const crear = async (datos = {}) => {
    const nombre = texto(datos.nombre, 'El nombre');
    const apellido = texto(datos.apellido, 'El apellido');
    const email = texto(datos.email, 'El email', { max: 150 }).toLowerCase();
    if (!REGEX_EMAIL.test(email)) throw errorHttp('El email no es válido.');
    validarClave(datos.password);
    if (await User.exists({ email })) throw errorHttp('Ya hay una cuenta con ese email.', 409);
    const empleado = await User.create({
        nombre,
        apellido,
        email,
        telefono: texto(datos.telefono, 'El teléfono', { obligatorio: false, max: 30 }),
        contrasena: await bcrypt.hash(datos.password, 10),
        rol: 'empleado',
        // La cuenta la crea el admin con un email que conoce: no pasa por el mail de verificación
        emailVerificado: true,
        permisos: datos.permisos === undefined ? PERMISOS_POR_DEFECTO : limpiarPermisos(datos.permisos),
        activo: true,
    });
    return publico(empleado);
};

const buscar = async (id) => {
    const empleado = /^[a-f\d]{24}$/i.test(String(id)) ? await User.findOne({ _id: id, rol: 'empleado' }) : null;
    if (!empleado) throw errorHttp('No encontramos a ese empleado.', 404);
    return empleado;
};

// Cambiar permisos, datos o contraseña, dar de baja o reactivar.
// Dar de baja o cambiar la contraseña corta las sesiones que ya estaban abiertas.
const actualizar = async (id, datos = {}) => {
    const empleado = await buscar(id);
    let cortarSesiones = false;
    if (datos.nombre !== undefined) empleado.nombre = texto(datos.nombre, 'El nombre');
    if (datos.apellido !== undefined) empleado.apellido = texto(datos.apellido, 'El apellido');
    if (datos.telefono !== undefined) empleado.telefono = texto(datos.telefono, 'El teléfono', { obligatorio: false, max: 30 });
    if (datos.permisos !== undefined) empleado.permisos = limpiarPermisos(datos.permisos);
    if (datos.activo !== undefined) {
        const activo = datos.activo === true;
        if (!activo && empleado.activo !== false) cortarSesiones = true;
        empleado.activo = activo;
    }
    if (datos.password !== undefined && datos.password !== '') {
        validarClave(datos.password);
        empleado.contrasena = await bcrypt.hash(datos.password, 10);
        cortarSesiones = true;
    }
    if (cortarSesiones) empleado.credencialesCambiadasEn = new Date();
    await empleado.save();
    return publico(empleado);
};

// Dar de baja: la cuenta queda (para el registro de actividad) pero no puede ingresar
const darDeBaja = (id) => actualizar(id, { activo: false });

module.exports = { listar, crear, actualizar, darDeBaja, publico };
