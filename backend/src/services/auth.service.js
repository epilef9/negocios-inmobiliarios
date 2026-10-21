const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/users.repository');
const crypto = require('node:crypto');
const config = require('../config/env');
const emailService = require('./email.service');

const HORAS_VALIDEZ_ENLACE = 24;
const SEGUNDOS_ENTRE_REENVIOS = 60;

const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');

const errorHttp = (mensaje, statusCode, code) => {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
};

const datosPublicos = (user) => ({
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
    email: user.email,
    role: user.role,
    checklistRequisitos: user.checklistRequisitos || [],
    emailVerificado: user.emailVerificado !== false,
    createdAt: user.createdAt
});

const firmarSesion = (user) =>
    jwt.sign(
        { id: user._id, email: user.email, role: user.role, nombre: user.nombre, apellido: user.apellido },
        getJwtSecret(),
        { expiresIn: '24h' }
    );

// Genera un enlace nuevo para la cuenta (invalida el anterior), lo guarda hasheado y lo manda por mail
const mandarVerificacion = async (user) => {
    const token = crypto.randomBytes(32).toString('hex');
    user.verificacionHash = hashDe(token);
    user.verificacionExpira = new Date(Date.now() + HORAS_VALIDEZ_ENLACE * 3600 * 1000);
    await user.save();
    const enlace = `${config.urlFrontend()}/verificar-email?token=${token}`;
    const envio = await emailService.enviarVerificacion({ para: user.email, nombre: user.nombre, enlace });
    // Sin servicio de mails configurado (solo en desarrollo) el enlace se devuelve para poder probar sin correo
    return { enlaceDev: envio.simulado ? enlace : undefined };
};

// La clave sale de la configuración central (obligatoria en producción)
const getJwtSecret = () => {
    const secreto = config.jwtSecret();
    if (!secreto) throw new Error('JWT_SECRET no está configurada');
    return secreto;
};

const authService = {
    register: async (userData) => {
        // Verificar si el correo ya existe
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            const error = new Error('El correo electronico ya se encuentra registrado');
            error.statusCode = 409;
            throw error;
        }

        // Hashear contrasena
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Crear usuario en base de datos mediante el repositorio.
        // El registro publico siempre crea clientes; nunca aceptar role del request (escalada de privilegios).
        // Queda sin verificar: no puede ingresar hasta confirmar el enlace que se le manda por mail.
        const newUser = await userRepository.createUser({
            nombre: userData.nombre ? userData.nombre.trim() : '',
            apellido: userData.apellido ? userData.apellido.trim() : '',
            telefono: userData.telefono ? userData.telefono.trim() : '',
            username: userData.username || userData.email.toLowerCase().trim(),
            email: userData.email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'cliente',
            emailVerificado: false
        });

        // Si el mail falla la cuenta queda creada: puede pedir el reenvío desde el ingreso
        let correoEnviado = true;
        let enlaceDev;
        try {
            ({ enlaceDev } = await mandarVerificacion(newUser));
        } catch (error) {
            correoEnviado = false;
            console.error('[verificacion] No se pudo enviar el mail:', error.message);
        }

        return { requiereVerificacion: true, correoEnviado, enlaceDev, user: datosPublicos(newUser) };
    },

    login: async (email, password) => {
        // Buscar usuario por correo mediante el repositorio
        const user = await userRepository.findByEmail(email);
        if (!user) {
            const error = new Error('Credenciales invalidas');
            error.statusCode = 401;
            throw error;
        }

        // Comparar contrasena hasheada
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('Credenciales invalidas');
            error.statusCode = 401;
            throw error;
        }

        // Se avisa recién después de comprobar la contraseña, para no revelar qué correos existen
        if (user.emailVerificado === false) {
            throw errorHttp('Confirmá tu email para ingresar. Te mandamos un enlace al registrarte.', 403, 'EMAIL_NO_VERIFICADO');
        }

        return { token: firmarSesion(user), user: datosPublicos(user) };
    },

    // Confirma el enlace del mail y deja la sesión iniciada
    verifyEmail: async (token) => {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            throw errorHttp('El enlace de verificación no es válido', 400, 'ENLACE_INVALIDO');
        }
        const user = await userRepository.findByVerificacionHash(hashDe(token));
        if (!user || !user.verificacionExpira || user.verificacionExpira < new Date()) {
            throw errorHttp('El enlace venció o ya se usó. Pedí uno nuevo desde el ingreso.', 400, 'ENLACE_INVALIDO');
        }
        user.emailVerificado = true;
        user.verificacionHash = undefined;
        user.verificacionExpira = undefined;
        await user.save();
        return { token: firmarSesion(user), user: datosPublicos(user) };
    },

    // Responde siempre lo mismo exista o no la cuenta, para no revelar qué correos están registrados
    resendVerification: async (email) => {
        const user = await userRepository.findByEmailConVerificacion(email);
        if (!user || user.emailVerificado !== false) return {};

        const emitido = user.verificacionExpira
            ? user.verificacionExpira.getTime() - HORAS_VALIDEZ_ENLACE * 3600 * 1000
            : 0;
        const faltan = Math.ceil((SEGUNDOS_ENTRE_REENVIOS * 1000 - (Date.now() - emitido)) / 1000);
        if (faltan > 0) {
            const error = errorHttp('Esperá un minuto antes de pedir otro enlace', 429, 'REENVIO_MUY_SEGUIDO');
            error.segundos = faltan;
            throw error;
        }
        return mandarVerificacion(user);
    },

    logout: async () => {
        return { message: 'Cierre de sesion exitoso' };
    },

    verifyToken: (token) => {
        return jwt.verify(token, getJwtSecret());
    }
};

module.exports = authService;