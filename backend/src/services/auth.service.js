const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/users.repository');
const crypto = require('node:crypto');
const config = require('../config/env');
const emailService = require('./email.service');

const HORAS_VALIDEZ_ENLACE = 24;
const SEGUNDOS_ENTRE_REENVIOS = 60;
const MINUTOS_VALIDEZ_RESTABLECER = 30;
const User = require('../models/user.model');

// Hash de una contraseña cualquiera: cuando el email no existe se compara igual contra esto,
// así la respuesta tarda lo mismo y no se puede deducir qué emails tienen cuenta
const HASH_FICTICIO = bcrypt.hashSync('contraseña-que-no-existe', 10);
const TOKEN_VALIDO = /^[a-f0-9]{64}$/;

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
    dni: user.dni || '',
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
        // El teléfono es opcional, pero si viene tiene que ser un número de verdad (no un email ni letras)
        const telefono = typeof userData.telefono === 'string' ? userData.telefono.trim() : '';
        const digitosTelefono = telefono.replace(/\D/g, '').length;
        if (telefono && (!/^[\d\s+().-]+$/.test(telefono) || digitosTelefono < 8 || digitosTelefono > 15)) {
            const error = new Error('Revisá el teléfono: solo números, con característica (entre 8 y 15 números).');
            error.statusCode = 400;
            throw error;
        }

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
            telefono,
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
            await bcrypt.compare(password, HASH_FICTICIO);
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

    // Manda un enlace para elegir contraseña nueva. Responde siempre igual, exista o no la cuenta.
    solicitarRestablecimiento: async (email) => {
        const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+restablecimientoHash +restablecimientoExpira');
        if (!user) return {};

        // Si ya se mandó uno hace menos de un minuto no se manda otro (evita llenar la casilla de alguien)
        const emitido = user.restablecimientoExpira ? user.restablecimientoExpira.getTime() - MINUTOS_VALIDEZ_RESTABLECER * 60 * 1000 : 0;
        if (Date.now() - emitido < SEGUNDOS_ENTRE_REENVIOS * 1000) return {};

        const token = crypto.randomBytes(32).toString('hex');
        user.restablecimientoHash = hashDe(token);
        user.restablecimientoExpira = new Date(Date.now() + MINUTOS_VALIDEZ_RESTABLECER * 60 * 1000);
        await user.save();

        const enlace = `${config.urlFrontend()}/restablecer-contrasena?token=${token}`;
        const envio = await emailService.enviarRestablecimiento({ para: user.email, nombre: user.nombre, enlace, minutos: MINUTOS_VALIDEZ_RESTABLECER });
        return { enlaceDev: envio.simulado ? enlace : undefined };
    },

    // Guarda la contraseña nueva con el enlace del mail y cierra todas las sesiones abiertas
    restablecerPassword: async (token, password) => {
        if (typeof token !== 'string' || !TOKEN_VALIDO.test(token)) {
            throw errorHttp('El enlace no es válido. Pedí uno nuevo.', 400, 'ENLACE_INVALIDO');
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
            throw errorHttp('La contraseña tiene que tener entre 8 y 72 caracteres.', 400, 'PASSWORD_INVALIDA');
        }
        const user = await User.findOne({ restablecimientoHash: hashDe(token) }).select('+restablecimientoHash +restablecimientoExpira');
        if (!user || !user.restablecimientoExpira || user.restablecimientoExpira < new Date()) {
            throw errorHttp('El enlace venció o ya se usó. Pedí uno nuevo.', 400, 'ENLACE_INVALIDO');
        }
        if (await bcrypt.compare(password, user.password)) {
            throw errorHttp('La contraseña nueva tiene que ser distinta de la anterior.', 400, 'PASSWORD_REPETIDA');
        }

        user.password = await bcrypt.hash(password, 10);
        user.restablecimientoHash = undefined;
        user.restablecimientoExpira = undefined;
        user.credencialesCambiadasEn = new Date();
        // Usar el enlace prueba que la casilla es suya
        user.emailVerificado = true;
        await user.save();

        emailService.avisarPasswordCambiada({ para: user.email, nombre: user.nombre }).catch((error) =>
            console.error('[contraseña] No se pudo mandar el aviso:', error.message)
        );
        return { email: user.email };
    },

    // Confirma el email nuevo desde el enlace que le llegó a esa casilla
    confirmarCambioEmail: async (token) => {
        if (typeof token !== 'string' || !TOKEN_VALIDO.test(token)) {
            throw errorHttp('El enlace no es válido.', 400, 'ENLACE_INVALIDO');
        }
        const user = await User.findOne({ cambioEmailHash: hashDe(token) }).select('+cambioEmailHash +cambioEmailExpira +emailPendiente');
        if (!user || !user.emailPendiente || !user.cambioEmailExpira || user.cambioEmailExpira < new Date()) {
            throw errorHttp('El enlace venció o ya se usó. Pedí el cambio de nuevo desde tu cuenta.', 400, 'ENLACE_INVALIDO');
        }
        const ocupado = await User.exists({ email: user.emailPendiente, _id: { $ne: user._id } });
        if (ocupado) {
            throw errorHttp('Ese email ya lo usa otra cuenta.', 409, 'EMAIL_EN_USO');
        }

        const anterior = user.email;
        user.email = user.emailPendiente;
        if (!user.username || user.username === anterior) user.username = user.email;
        user.emailPendiente = undefined;
        user.cambioEmailHash = undefined;
        user.cambioEmailExpira = undefined;
        user.emailVerificado = true;
        user.credencialesCambiadasEn = new Date(Date.now() - 1000);
        await user.save();

        emailService.avisarEmailCambiado({ para: anterior, nombre: user.nombre, nuevo: user.email }).catch((error) =>
            console.error('[email] No se pudo avisar al email anterior:', error.message)
        );
        // Las otras sesiones se cierran; esta queda iniciada con el email nuevo
        return { token: firmarSesion(user), user: datosPublicos(user) };
    },

    logout: async () => {
        return { message: 'Cierre de sesion exitoso' };
    },

    verifyToken: (token) => {
        return jwt.verify(token, getJwtSecret());
    }
};

module.exports = authService;