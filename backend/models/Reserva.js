const mongoose = require("mongoose");

const ReservaSchema = new mongoose.Schema(
  {
    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad", required: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    fecha_reserva: { type: Date, default: Date.now },
    monto_sena: { type: Number },
    comprobante_pago: { type: String }, // url del archivo subido
    estado: {
      type: String,
      enum: ["pendiente", "confirmado", "rechazado"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reserva", ReservaSchema);
