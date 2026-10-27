const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nombre: {
        type: String,
        trim: true
    },
    apellido: {
        type: String,
        trim: true
    },
    telefono: {
        type: String,
        trim: true
    },
    dni: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['admin', 'cliente', 'user'],
        default: 'cliente'
    },
    // Las cuentas que ya existían quedan como verificadas; el registro público las crea en false
    emailVerificado: {
        type: Boolean,
        default: true
    },
    // Del enlace que se manda por mail solo se guarda el hash: si se filtra la base, los enlaces no sirven
    verificacionHash: {
        type: String,
        select: false
    },
    verificacionExpira: {
        type: Date,
        select: false
    },
    // Enlace para crear una contraseña nueva (olvido o cambio desde el perfil). Igual que arriba: solo el hash.
    restablecimientoHash: {
        type: String,
        select: false
    },
    restablecimientoExpira: {
        type: Date,
        select: false
    },
    // Cambio de email pendiente: el email nuevo recién se usa cuando se confirma desde esa casilla
    emailPendiente: {
        type: String,
        trim: true,
        lowercase: true,
        select: false
    },
    cambioEmailHash: {
        type: String,
        select: false
    },
    cambioEmailExpira: {
        type: Date,
        select: false
    },
    // Cuándo cambió la contraseña o el email por última vez: las sesiones iniciadas antes dejan de valer
    credencialesCambiadasEn: {
        type: Date
    },
    checklistRequisitos: {
        type: [String],
        default: []
    },
    // Propiedades que el usuario guardó como favoritas
    favoritos: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
        default: []
    },
    preferencias: {
        tema: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        },
        paleta: {
            type: String,
            default: 'corporativo'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para asignar username por defecto y actualizar fecha
userSchema.pre('save', function() {
    if (!this.username && this.email) {
        this.username = this.email;
    }
    this.updatedAt = Date.now();
});

const User = mongoose.model('User', userSchema);

module.exports = User;