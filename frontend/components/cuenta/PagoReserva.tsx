'use client';

import { useEffect, useId, useState } from 'react';
import { getOpcionesPago, pagarConMercadoPago, pesos, subirComprobante, type OpcionesPago, type Pago } from '@/services/pagos';

// Mi cuenta: pagar una reserva. Mercado Pago abre su propio checkout (la tarjeta nunca pasa por este sitio);
// por transferencia se muestran los datos y se sube el comprobante, que confirma la inmobiliaria.
export default function PagoReserva({ reservaId, alSubirComprobante }: { reservaId: string; alSubirComprobante: (p: Pago) => void }) {
  const id = useId();
  const [opciones, setOpciones] = useState<OpcionesPago | null>(null);
  const [error, setError] = useState('');
  const [yendo, setYendo] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    let activo = true;
    getOpcionesPago(reservaId)
      .then((o) => activo && setOpciones(o))
      .catch((e: Error) => activo && setError(e.message || 'No pudimos preparar el pago.'));
    return () => {
      activo = false;
    };
  }, [reservaId]);

  const irAMercadoPago = async () => {
    setYendo(true);
    setError('');
    try {
      const { url } = await pagarConMercadoPago(reservaId);
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir Mercado Pago.');
      setYendo(false);
    }
  };

  const enviarComprobante = async () => {
    if (!archivo) return;
    if (archivo.size > 4 * 1024 * 1024) return setError('El comprobante puede pesar hasta 4 MB.');
    setSubiendo(true);
    setError('');
    try {
      alSubirComprobante(await subirComprobante(reservaId, archivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir el comprobante.');
    } finally {
      setSubiendo(false);
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
  if (!opciones) return <span aria-busy="true" className="calma-brillo h-24 w-full" />;
  if (!opciones.mercadoPago && !opciones.transferencia) {
    return <p className="m-0 text-[14px] text-[#efe9df]/70">El pago online todavía no está habilitado. Escribinos y coordinamos cómo pagar.</p>;
  }

  return (
    <div className="calma-aparecer flex flex-col gap-5 rounded-2xl border border-[#efe9df]/15 p-5">
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 text-[15px] text-[#efe9df]/80">
        Total a pagar
        <span className="font-display tabular text-[28px] leading-none text-[#efe9df]">{pesos(opciones.montoARS)}</span>
        <span className="tabular text-[13px] text-[#efe9df]/55">
          USD {opciones.montoUSD.toLocaleString('es-AR')} × ${opciones.cotizacion.toLocaleString('es-AR')} (dólar de hoy)
        </span>
      </p>

      {opciones.mercadoPago && (
        <button type="button" onClick={irAMercadoPago} disabled={yendo} className="calma-micro flex min-h-12 items-center justify-center gap-2.5 self-start rounded-full bg-[#efe9df] px-6 text-[12px] text-[#071733] transition-colors hover:bg-white disabled:opacity-60">
          <span className="calma-dot" aria-hidden="true" />
          {yendo ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
        </button>
      )}

      {opciones.transferencia && (
        <div className="flex flex-col gap-3 border-t border-[#efe9df]/12 pt-4">
          <p className="calma-micro m-0 text-[#efe9df]/60">{opciones.mercadoPago ? 'O por transferencia' : 'Por transferencia'}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[14.5px]">
            {(
              [
                ['Titular', opciones.transferencia.titular],
                ['Banco', opciones.transferencia.banco],
                ['CBU/CVU', opciones.transferencia.cbu],
                ['Alias', opciones.transferencia.alias],
                ['CUIT', opciones.transferencia.cuit],
                ['Monto exacto', pesos(opciones.montoARS)],
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
          <label htmlFor={`${id}-comprobante`} className="mt-1 text-[14px] text-[#efe9df]/80">
            Después de transferir, subí el comprobante (PDF o foto, hasta 4 MB):
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id={`${id}-comprobante`}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="max-w-full text-[13px] text-[#efe9df]/80 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#efe9df]/10 file:px-4 file:py-2 file:text-[#efe9df]"
            />
            <button type="button" onClick={enviarComprobante} disabled={!archivo || subiendo} className="calma-micro rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] transition-colors hover:border-[#efe9df] disabled:opacity-50">
              {subiendo ? 'Subiendo…' : 'Enviar comprobante'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-[14px] text-[#ffb4ad]">
          {error}
        </p>
      )}
    </div>
  );
}
