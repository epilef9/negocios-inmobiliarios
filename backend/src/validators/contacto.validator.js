// Validación del formulario de contacto

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const validateContacto = (req, res, next) => {
    const nombre = texto(req.body && req.body.nombre);
    const email = texto(req.body && req.body.email);
    const telefono = texto(req.body && req.body.telefono);
    const motivo = texto(req.body && req.body.motivo);
    const mensaje = texto(req.body && req.body.mensaje);
    const errors = [];

    if (!nombre) errors.push('El nombre es obligatorio');
    if (!EMAIL.test(email)) errors.push('El correo electronico no es valido');
    if (!mensaje) errors.push('El mensaje es obligatorio');
    if (nombre.length > 100) errors.push('El nombre es demasiado largo');
    if (email.length > 150) errors.push('El correo electronico es demasiado largo');
    if (telefono.length > 40) errors.push('El telefono es demasiado largo');
    if (motivo.length > 100) errors.push('El motivo es demasiado largo');
    if (mensaje.length > 3000) errors.push('El mensaje es demasiado largo (máximo 3000 caracteres)');
    // Un salto de línea en estos campos podría usarse para inyectar encabezados del mail
    if (/[\r\n]/.test(nombre + email + telefono + motivo)) errors.push('Hay caracteres no permitidos');

    if (errors.length) return res.status(400).json({ message: 'Datos de contacto invalidos', errors });

    req.body = { nombre, email, telefono, motivo, mensaje };
    next();
};

module.exports = { validateContacto };
