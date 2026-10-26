const mongoose = require('mongoose');

const requisitoSchema = new mongoose.Schema({
    operacion: {
        type: String,
        enum: ['alquilar', 'comprar', 'publicar'],
        required: true,
        index: true,
    },
    seccion: {
        type: String,
        required: true,
        trim: true,
    },
    texto: {
        type: String,
        required: true,
        trim: true,
    },
    orden: {
        type: Number,
        default: 0,
    },
    activo: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

requisitoSchema.index({ operacion: 1, orden: 1 });

module.exports = mongoose.model('Requisito', requisitoSchema);
