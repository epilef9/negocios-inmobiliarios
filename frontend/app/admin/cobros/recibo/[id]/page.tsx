'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import LogoEmpresa from '@/components/sitio/LogoEmpresa';
import { useContacto } from '@/components/sitio/useAjustes';
import { enLetras } from '@/components/panel/enLetras';
import { dinero, getRecibo, MEDIOS, nombreMes, type Recibo } from '@/services/cobros';

// Recibo de alquiler en una hoja A4, para imprimir o guardar como PDF desde el navegador.
// Usa la copia de los datos que se guardó al registrar el pago (si después se edita el contrato, el recibo no cambia).

const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONEDA = { ARS: 'pesos', USD: 'dólares estadounidenses' };

export default function ReciboAlquiler() {
  const { id } = useParams<{ id: string }>();
  const contacto = useContacto();
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getRecibo(id)
      .then((r) => activo && setRecibo(r))
      .catch((e: Error) => activo && setError(e.message || 'No pudimos cargar el recibo'));
    return () => {
      activo = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="min-h-dvh bg-white p-10 text-[#071733]">
        <p>{error}</p>
        <Link href="/admin/cobros" className="underline">
          Volver a Cobros
        </Link>
      </main>
    );
  }
  if (!recibo) return <main aria-busy="true" className="min-h-dvh bg-white" />;

  const numero = String(recibo.numeroRecibo).padStart(6, '0');

  return (
    <main className="min-h-dvh bg-[#e9e6e0] py-8 text-[#071733] print:bg-white print:py-0">
      <title>{`Recibo ${numero} · ${recibo.inquilino}`}</title>
      <div className="no-imprimir mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link href="/admin/cobros" className="text-[14px] underline">
          ← Volver a Cobros
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-[#071733] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
          Imprimir o guardar PDF
        </button>
      </div>

      <article id="recibo-imprimible" className="mx-auto flex max-w-[210mm] flex-col gap-7 bg-white p-[14mm] text-[14px] leading-relaxed shadow-xl print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-[#071733]/15 pb-5">
          <div className="flex flex-col gap-2">
            <LogoEmpresa version="apilado" className="h-12 w-auto" prioridad />
            <p className="m-0 text-[12px] leading-snug">
              {contacto.direccionCompleta}, Entre Ríos
              <br />
              {contacto.telefono} · {contacto.email}
            </p>
          </div>
          <div className="text-right">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.14em]">Recibo de alquiler</p>
            <p className="tabular m-0 text-[20px] font-semibold">N.º {numero}</p>
            <p className="m-0 text-[12px]">{fechaLarga(recibo.pagadoEl)}</p>
          </div>
        </header>

        <p className="m-0 text-[15px]">
          Recibí de <strong>{recibo.inquilino}</strong> la suma de <strong>{MONEDA[recibo.moneda]} {enLetras(recibo.monto)}</strong>{' '}
          (<span className="tabular">{dinero(recibo.monto, recibo.moneda)}</span>) en concepto de alquiler del mes de{' '}
          <strong>{nombreMes(recibo.periodo)}</strong> de la propiedad <strong>{recibo.propiedad.titulo}</strong>
          {recibo.propiedad.direccion ? `, ${recibo.propiedad.direccion}` : ''}, según contrato n.º {recibo.numeroContrato}.
        </p>

        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded border border-[#071733]/15 p-4 text-[13px]">
          <dt className="text-[#071733]/65">Período</dt>
          <dd className="m-0">{nombreMes(recibo.periodo)}</dd>
          <dt className="text-[#071733]/65">Importe</dt>
          <dd className="tabular m-0 font-semibold">{dinero(recibo.monto, recibo.moneda)}</dd>
          <dt className="text-[#071733]/65">Forma de pago</dt>
          <dd className="m-0">{MEDIOS[recibo.medio]}</dd>
          {recibo.propietario && (
            <>
              <dt className="text-[#071733]/65">Locador</dt>
              <dd className="m-0">{recibo.propietario}</dd>
            </>
          )}
          {recibo.nota && (
            <>
              <dt className="text-[#071733]/65">Observaciones</dt>
              <dd className="m-0">{recibo.nota}</dd>
            </>
          )}
        </dl>

        <footer className="mt-16 flex justify-end">
          <div className="w-64 border-t border-[#071733]/60 pt-2 text-center text-[12px]">
            Araceli Balbuena · Negocios Inmobiliarios
            {recibo.propietario && (
              <>
                <br />
                por cuenta y orden de {recibo.propietario}
              </>
            )}
          </div>
        </footer>
      </article>
    </main>
  );
}
