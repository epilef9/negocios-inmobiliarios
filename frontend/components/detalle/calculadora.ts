import type { Costos } from '@/services/ajustes';

export type Renglon = { concepto: string; detalle?: string; monto: number };
export type Calculo = { moneda: 'USD' | 'ARS'; renglones: Renglon[]; total: number; extraARS?: number; nota?: string };

const pct = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;

// Alquiler: primer mes + depósito + honorarios y sellado sobre el total del contrato (+ gastos fijos en pesos)
export function calcularAlquiler(mensual: number, moneda: 'USD' | 'ARS', meses: number, c: Costos['alquiler'], blue: number | null): Calculo {
  const contrato = mensual * meses;
  const renglones: Renglon[] = [{ concepto: 'Primer mes de alquiler', monto: mensual }];
  if (c.mesesDeposito > 0) renglones.push({ concepto: 'Depósito en garantía', detalle: `${c.mesesDeposito} ${c.mesesDeposito === 1 ? 'mes' : 'meses'}`, monto: mensual * c.mesesDeposito });
  if (c.honorariosPorcentaje > 0) renglones.push({ concepto: 'Honorarios de la inmobiliaria', detalle: `${pct(c.honorariosPorcentaje)} del contrato de ${meses} meses`, monto: (contrato * c.honorariosPorcentaje) / 100 });
  if (c.selladoPorcentaje > 0) renglones.push({ concepto: 'Sellado del contrato', detalle: `${pct(c.selladoPorcentaje)} del contrato`, monto: (contrato * c.selladoPorcentaje) / 100 });
  let extraARS: number | undefined;
  if (c.gastosFijosARS > 0) {
    if (moneda === 'ARS') renglones.push({ concepto: 'Gastos administrativos', monto: c.gastosFijosARS });
    else if (blue) renglones.push({ concepto: 'Gastos administrativos', detalle: `ARS ${Math.round(c.gastosFijosARS).toLocaleString('es-AR')}`, monto: c.gastosFijosARS / blue });
    else extraARS = c.gastosFijosARS;
  }
  return { moneda, renglones, total: renglones.reduce((s, r) => s + r.monto, 0), extraARS };
}

// Venta: lo que se paga aparte del precio (honorarios y escritura) y la seña para reservar
export function calcularVenta(precio: number, moneda: 'USD' | 'ARS', c: Costos['venta']): Calculo {
  const renglones: Renglon[] = [{ concepto: 'Precio de la propiedad', monto: precio }];
  if (c.honorariosPorcentaje > 0) renglones.push({ concepto: 'Honorarios de la inmobiliaria', detalle: pct(c.honorariosPorcentaje), monto: (precio * c.honorariosPorcentaje) / 100 });
  if (c.escrituraPorcentaje > 0) renglones.push({ concepto: 'Gastos de escritura', detalle: `aprox. ${pct(c.escrituraPorcentaje)}`, monto: (precio * c.escrituraPorcentaje) / 100 });
  const nota = c.senaPorcentaje > 0 ? `Para reservarla se deja una seña de alrededor del ${pct(c.senaPorcentaje)} (${moneda} ${Math.round((precio * c.senaPorcentaje) / 100).toLocaleString('es-AR')}), que después se descuenta del precio.` : undefined;
  return { moneda, renglones, total: renglones.reduce((s, r) => s + r.monto, 0), nota };
}
