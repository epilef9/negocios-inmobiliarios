const mongoose = require('mongoose');

const localidadSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true, trim: true },
    provincia: { type: String, enum: ['entre_rios'], default: 'entre_rios' },
    activa: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Localidad', localidadSchema);
