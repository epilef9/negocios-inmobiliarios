const mongoose = require('mongoose');

// Contadores correlativos que nunca vuelven atrás (por ahora, el número de recibo de los cobros).
// Un documento por contador: { _id: 'recibo', valor: 37 }.
const contadorSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        valor: { type: Number, default: 0 },
    },
    { versionKey: false }
);

module.exports = mongoose.models.Contador || mongoose.model('Contador', contadorSchema);
