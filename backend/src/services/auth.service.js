const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/users.repository');
const config = require('../config/env');

const getJwtSecret = () => process.env.JWT_SECRET || config.JWT_SECRET || 'inmobiliaria_token_key';

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
        const newUser = await userRepository.createUser({
            nombre: userData.nombre ? userData.nombre.trim() : '',
            apellido: userData.apellido ? userData.apellido.trim() : '',
            telefono: userData.telefono ? userData.telefono.trim() : '',
            username: userData.username || userData.email.toLowerCase().trim(),
            email: userData.email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'cliente'
        });

        // Generar token para inicio de sesion automatico segun criterio de HU-05
        const token = jwt.sign(
            {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                nombre: newUser.nombre,
                apellido: newUser.apellido
            },
            getJwtSecret(),
            { expiresIn: '24h' }
        );

        const safeUser = {
            id: newUser._id,
            nombre: newUser.nombre,
            apellido: newUser.apellido,
            telefono: newUser.telefono,
            email: newUser.email,
            role: newUser.role,
            checklistRequisitos: newUser.checklistRequisitos || [],
            createdAt: newUser.createdAt
        };

        return { token, user: safeUser };
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

        // Generar token firmado
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                nombre: user.nombre,
                apellido: user.apellido
            },
            getJwtSecret(),
            { expiresIn: '24h' }
        );

        const safeUser = {
            id: user._id,
            nombre: user.nombre,
            apellido: user.apellido,
            telefono: user.telefono,
            email: user.email,
            role: user.role,
            checklistRequisitos: user.checklistRequisitos || [],
            createdAt: user.createdAt
        };

        return { token, user: safeUser };
    },

    logout: async () => {
        return { message: 'Cierre de sesion exitoso' };
    },

    verifyToken: (token) => {
        return jwt.verify(token, getJwtSecret());
    }
};

module.exports = authService;