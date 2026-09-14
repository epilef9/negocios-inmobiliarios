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
    checklistRequisitos: {
        type: [String],
        default: []
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