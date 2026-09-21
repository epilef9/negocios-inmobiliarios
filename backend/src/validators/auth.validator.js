// auth.validator.js
// Validadores para las operaciones de autenticacion (Registro e Inicio de sesion)

const validateRegister = (req, res, next) => {
    const { nombre, apellido, email, password, confirmPassword } = req.body;
    const errors = [];

    // Validacion de nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        errors.push('El nombre es obligatorio');
    }

    // Validacion de apellido
    if (!apellido || typeof apellido !== 'string' || apellido.trim() === '') {
        errors.push('El apellido es obligatorio');
    }

    // Validacion de correo electronico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        errors.push('El correo electronico no es valido');
    }

    // Validacion de contrasena (minimo 8 caracteres segun prototipo)
    if (!password || typeof password !== 'string' || password.length < 8) {
        errors.push('La contrasena debe tener al menos 8 caracteres');
    }

    // Validacion de confirmacion de contrasena
    if (confirmPassword !== undefined && confirmPassword !== password) {
        errors.push('Las contrasenas no coinciden');
    }

    // Ignorar cualquier intento de autoasignarse rol desde el cliente
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'role')) {
        delete req.body.role;
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: 'Datos de registro invalidos',
            errors
        });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    // Validacion de correo electronico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        errors.push('El correo electronico no es valido');
    }

    // Validacion de contrasena
    if (!password || typeof password !== 'string' || password.trim() === '') {
        errors.push('La contrasena es obligatoria');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: 'Datos de inicio de sesion invalidos',
            errors
        });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin
};
