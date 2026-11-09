'use client';

import { useEffect, useId, useState } from 'react';
import {
  dolares,
  getOpcionesPago,
  pagarConMercadoPago,
  pesos,
  subirComprobante,
  subirComprobanteMP,
  type MontoAPagar,
  type OpcionesPago,
  type Pago,
  type TipoPago,
} from '@/services/pagos';

// Mi cuenta: pagar una estadía. Primero se elige cuánto: la seña (alcanza para que los días queden reservados) o el
// total; con la seña ya pagada, el saldo. Después, cómo: Mercado Pago abre su propio checkout (la tarjeta nunca pasa
// por este sitio) y por transferencia se muestran los datos. En los dos casos se sube la foto del comprobante, que
// revisa la inmobiliaria en Panel → Cobros.

const TAMANO_MAXIMO = 4 * 1024 * 1024;

const NOMBRE: Record<TipoPago, { titulo: string; detalle: (o: OpcionesPago) => string }> = {
  sena: { titulo: 'Seña', detalle: (o) => `El ${o.senaPorcentaje} % del total. Con la seña los días quedan reservados y el resto lo pagás después.` },
  total: { titulo: 'Total de la estadía', detalle: () => 'Pagás todas las noches ahora y te olvidás.' },
  saldo: { titulo: 'Saldo', detalle: (o) => `Ya pagaste ${dolares(o.pagadoUSD)} de ${dolares(o.totalUSD)}. Esto es lo que falta.` },
};

// Campo para elegir la foto o el PDF del comprobante y mandarlo
export function CampoComprobante({ etiqueta, alEnviar, boton = 'Enviar comprobante' }: { etiqueta: string; alEnviar: (archivo: File) => Promise<void>; boton?: string }) {
  const id = useId();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    if (!archivo) return;
    if (archivo.size > TAMANO_MAXIMO) return setError('El comprobante puede pesar hasta 4 MB.');
    setSubiendo(true);
    setError('');
    try {
      await alEnviar(archivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir el comprobante.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={`${id}-comprobante`} className="text-[14px] text-[#efe9df]/80">
        {etiqueta}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={`${id}-comprobante`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setError('');
          }}
          className="max-w-full text-[13px] text-[#efe9df]/80 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#efe9df]/10 file:px-4 file:py-2 file:text-[#efe9df]"
        />
        <button type="button" onClick={enviar} disabled={!archivo || subiendo} className="calma-micro rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] transition-colors hover:border-[#efe9df] disabled:opacity-50">
          {subiendo ? 'Subiendo…' : boton}
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-[14px] text-[#ffb4ad]">
          {error}
        </p>
      )}
    </div>
  );
}

// Después de pagar con Mercado Pago: la foto del comprobante (la pide la inmobiliaria para tener el respaldo)
export function ComprobanteMercadoPago({ pago, alSubir, yaPagaste = true }: { pago: Pago; alSubir: (p: Pago) => void; yaPagaste?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#efe9df]/15 p-5">
      <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]">
        {yaPagaste ? 'Último paso: subí la foto del comprobante de Mercado Pago.' : '¿Ya pagaste con Mercado Pago? Subí la foto del comprobante.'}
        <span className="block text-[14px] text-[#efe9df]/65">
          Es la pantalla de «Pago aprobado» o el mail que te mandó Mercado Pago ({pesos(pago.montoARS)}). La inmobiliaria la revisa en el día.
        </span>
      </p>
      <CampoComprobante etiqueta="Comprobante (foto o PDF, hasta 4 MB)" alEnviar={async (archivo) => alSubir(await subirComprobanteMP(pago.id, archivo))} />
    </div>
  );
}

export default function PagoReserva({ reservaId, alSubirComprobante }: { reservaId: string; alSubirComprobante: (p: Pago) => void }) {
  const id = useId();
  const [opciones, setOpciones] = useState<OpcionesPago | null>(null);
  const [tipo, setTipo] = useState<TipoPago | null>(null);
  const [error, setError] = useState('');
  const [yendo, setYendo] = useState(false);
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    let activo = true;
    getOpcionesPago(reservaId)
      .then((o) => {
        if (!activo) return;
        setOpciones(o);
        setTipo(o.montos[0]?.tipo ?? null);
      })
      .catch((e: Error) => activo && setError(e.message || 'No pudimos preparar el pago.'));
    return () => {
      activo = false;
    };
  }, [reservaId]);

  const elegido: MontoAPagar | undefined = opciones?.montos.find((m) => m.tipo === tipo) ?? opciones?.montos[0];

  const irAMercadoPago = async () => {
    if (!elegido) return;
    setYendo(true);
    setError('');
    try {
      const { url } = await pagarConMercadoPago(reservaId, elegido.tipo);
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir Mercado Pago.');
      setYendo(false);
    }
  };

  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(''), 2000);
    } catch {
      // sin portapapeles: el dato se ve igual
    }
  };

  if (error && !opciones) {
    return (
      <p role="alert" className="m-0 text-[14px] text-[#ffb4ad]">
        {error}
      </p>
    );
  }
  if (!opciones || !elegido) return <span aria-busy="true" className="calma-brillo h-24 w-full" />;
  if (!opciones.mercadoPago && !opciones.transferencia) {
    return <p className="m-0 text-[14px] text-[#efe9df]/70">El pago online todavía no está habilitado. Escribinos y coordinamos cómo pagar.</p>;
  }

  return (
    <div className="calma-aparecer flex flex-col gap-6 rounded-2xl border border-[#efe9df]/15 p-5">
      {/* 1. Cuánto */}
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="calma-micro mb-3 p-0 text-[#efe9df]/60">{opciones.montos.length > 1 ? '1 · ¿Cuánto pagás ahora?' : '1 · A pagar'}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {opciones.montos.map((m) => {
            const activo = m.tipo === elegido.tipo;
            return (
              <label
                key={m.tipo}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-colors duration-300 ${activo ? 'border-[#efe9df] bg-[#efe9df]/8' : 'border-[#efe9df]/20 hover:border-[#efe9df]/50'}`}
              >
                <span className="flex items-center gap-2.5 text-[15px] text-[#efe9df]">
                  <input type="radio" name={`${id}-tipo`} value={m.tipo} checked={activo} onChange={() => setTipo(m.tipo)} className="accent-[#d9382b]" />
                  {NOMBRE[m.tipo].titulo}
                </span>
                <span className="font-display tabular text-[26px] leading-none text-[#efe9df]">{pesos(m.montoARS)}</span>
                <span className="tabular text-[12.5px] text-[#efe9df]/55">{dolares(m.montoUSD)}</span>
                <span className="text-[13.5px] leading-snug text-[#efe9df]/70">{NOMBRE[m.tipo].detalle(opciones)}</span>
              </label>
            );
          })}
        </div>
        <p className="m-0 text-[12.5px] text-[#efe9df]/50">Los pesos salen del dólar de hoy: $ {opciones.cotizacion.toLocaleString('es-AR')} por dólar.</p>
      </fieldset>

      {/* 2. Cómo */}
      <div className="flex flex-col gap-4 border-t border-[#efe9df]/12 pt-5">
        <p className="calma-micro m-0 text-[#efe9df]/60">2 · ¿Cómo pagás?</p>

        {opciones.mercadoPago && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={irAMercadoPago} disabled={yendo} className="calma-micro flex min-h-12 items-center justify-center gap-2.5 self-start rounded-full bg-[#efe9df] px-6 text-[12px] text-[#071733] transition-colors hover:bg-white disabled:opacity-60">
              <span className="calma-dot" aria-hidden="true" />
              {yendo ? 'Abriendo Mercado Pago…' : `Pagar ${pesos(elegido.montoARS)} con Mercado Pago`}
            </button>
            <p className="m-0 text-[13px] text-[#efe9df]/60">Al terminar, volvé al sitio y subí la foto del comprobante.</p>
          </div>
        )}

        {opciones.transferencia && (
          <div className={`flex flex-col gap-3 ${opciones.mercadoPago ? 'border-t border-[#efe9df]/12 pt-4' : ''}`}>
            {opciones.mercadoPago && <p className="m-0 text-[14px] text-[#efe9df]/80">O por transferencia:</p>}
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[14.5px]">
              {(
                [
                  ['Titular', opciones.transferencia.titular],
                  ['Banco', opciones.transferencia.banco],
                  ['CBU/CVU', opciones.transferencia.cbu],
                  ['Alias', opciones.transferencia.alias],
                  ['CUIT', opciones.transferencia.cuit],
                  ['Monto exacto', pesos(elegido.montoARS)],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[#efe9df]/60">{k}</dt>
                    <dd className="tabular m-0 flex flex-wrap items-center gap-x-3 [overflow-wrap:anywhere]">
                      {v}
                      {(k === 'CBU/CVU' || k === 'Alias') && (
                        <button type="button" onClick={() => copiar(v, k)} className="calma-micro calma-link cursor-pointer text-[10px] text-[#efe9df]/70">
                          {copiado === k ? 'Copiado' : 'Copiar'}
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
            <CampoComprobante
              etiqueta={`Después de transferir, subí la foto o el PDF del comprobante (${NOMBRE[elegido.tipo].titulo.toLowerCase()}, hasta 4 MB):`}
              alEnviar={async (archivo) => alSubirComprobante(await subirComprobante(reservaId, archivo, elegido.tipo))}
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="m-0 text-[14px] text-[#ffb4ad]">
          {error}
        </p>
      )}
    </div>
  );
}
