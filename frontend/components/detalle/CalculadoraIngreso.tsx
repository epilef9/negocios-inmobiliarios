'use client';

import { useId, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { useAjustes } from '@/components/sitio/useAjustes';
import { descuentoVigente } from '@/components/sitio/precio';
import { calcularAlquiler, calcularVenta } from './calculadora';
import { operacionesAbiertas, precioDe } from '@/components/sitio/operaciones';

const formato = (n: number) => Math.round(n).toLocaleString('es-AR');

// «¿Cuánto necesito para entrar?»: suma lo que hay que tener para alquilar o comprar con los porcentajes que
// carga la inmobiliaria. Solo aparece cuando el administrador publicó esos valores.
export default function CalculadoraIngreso({ propiedad, blue }: { propiedad: ApiProperty; blue: number | null }) {
  const id = useId();
  const { costos } = useAjustes();
  const [abierta, setAbierta] = useState(false);
  // HU-25: con venta y alquiler se elige qué calcular; solo las operaciones que siguen abiertas
  const opciones = operacionesAbiertas(propiedad).filter((o): o is 'venta' | 'alquiler' => o === 'venta' || o === 'alquiler');
  const [elegida, setElegida] = useState<'venta' | 'alquiler' | null>(null);
  const operacion = elegida && opciones.includes(elegida) ? elegida : opciones[0];
  const mesesPublicados = propiedad.duracionAlquilerMeses || 0;
  const [meses, setMeses] = useState(mesesPublicados || 24);

  if (!costos || !operacion) return null;

  const precio = precioDe(propiedad, operacion) ?? { price: propiedad.price, moneda: propiedad.moneda === 'ARS' ? 'ARS' : 'USD', priceARS: propiedad.priceARS };
  const moneda = precio.moneda === 'ARS' ? 'ARS' : 'USD';
  const base = (moneda === 'ARS' ? precio.priceARS ?? precio.price : precio.price) * (1 - descuentoVigente(propiedad) / 100);
  const calculo = operacion === 'alquiler' ? calcularAlquiler(base, moneda, meses, costos.alquiler, blue) : calcularVenta(base, moneda, costos.venta);

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={`${id}-titulo`} className="font-display m-0 text-[32px] font-normal">
          ¿Cuánto necesito {operacion === 'alquiler' ? 'para entrar' : 'para comprarla'}?
        </h2>
        {opciones.length > 1 && (
          <div role="group" aria-label="Qué calcular" className="flex gap-2">
            {opciones.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={operacion === o}
                onClick={() => setElegida(o)}
                className={`calma-micro cursor-pointer rounded-full px-4 py-2 text-[11px] transition-colors ${operacion === o ? 'bg-[#efe9df] text-[#071733]' : 'border border-[#efe9df]/30 text-[#efe9df]/80 hover:border-[#efe9df]'}`}
              >
                {o === 'venta' ? 'Comprar' : 'Alquilar'}
              </button>
            ))}
          </div>
        )}
        <button type="button" aria-expanded={abierta} aria-controls={`${id}-detalle`} onClick={() => setAbierta((a) => !a)} className="calma-micro calma-link cursor-pointer text-[12px]">
          {abierta ? 'Ocultar el detalle' : 'Ver el cálculo'}
        </button>
      </div>
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 text-[16px] text-[#efe9df]/80">
        <span>Total aproximado</span>
        <span className="font-display tabular text-[34px] leading-none text-[#efe9df]">
          {calculo.moneda} {formato(calculo.total)}
        </span>
        {calculo.moneda === 'USD' && blue && <span className="tabular text-[14px] text-[#efe9df]/60">≈ ARS {formato(calculo.total * blue)}</span>}
      </p>
      {abierta && (
        <div id={`${id}-detalle`} className="calma-aparecer flex flex-col gap-4">
          {operacion === 'alquiler' && (
            <label className="flex flex-wrap items-center gap-3 text-[15px] text-[#efe9df]/80">
              Duración del contrato
              <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} className="rounded-full border border-[#efe9df]/30 bg-[#071733] px-4 py-2 text-[14px] text-[#efe9df]">
                {[...new Set([12, 24, 36, mesesPublicados].filter(Boolean))].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m} meses{m === mesesPublicados ? ' (el de esta propiedad)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <dl className="m-0 flex flex-col">
            {calculo.renglones.map((r) => (
              <div key={r.concepto} className="flex items-baseline justify-between gap-4 border-b border-[#efe9df]/10 py-3">
                <dt className="flex flex-col">
                  <span className="text-[15px]">{r.concepto}</span>
                  {r.detalle && <span className="text-[13px] text-[#efe9df]/55">{r.detalle}</span>}
                </dt>
                <dd className="tabular m-0 shrink-0 text-[15px]">
                  {calculo.moneda} {formato(r.monto)}
                </dd>
              </div>
            ))}
          </dl>
          {calculo.extraARS ? <p className="m-0 text-[14px] text-[#efe9df]/70">Más ARS {formato(calculo.extraARS)} de gastos administrativos.</p> : null}
          {calculo.nota && <p className="m-0 text-[14px] text-[#efe9df]/70">{calculo.nota}</p>}
          <p className="m-0 text-[13px] text-[#efe9df]/55">{costos.aclaracion || 'Valores estimados. Confirmá el monto con la inmobiliaria.'}</p>
        </div>
      )}
    </section>
  );
}
