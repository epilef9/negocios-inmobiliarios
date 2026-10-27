'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { avisarDisponibilidad, getMisAvisos, quitarAviso } from '@/services/avisos';

// Campanita «Avisame cuando esté disponible» en la ficha de una propiedad alquilada o reservada.
// Sin sesión lleva a ingresar y vuelve a la ficha.
export default function AvisoDisponibilidad({ propiedadId }: { propiedadId: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [avisoId, setAvisoId] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const esCliente = user?.role === 'cliente';

  useEffect(() => {
    if (!esCliente) return;
    let activo = true;
    getMisAvisos()
      .then((lista) => {
        const mio = lista.find((a) => a.tipo === 'disponibilidad' && a.propiedad?._id === propiedadId);
        if (activo) setAvisoId(mio?._id ?? null);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [esCliente, propiedadId]);

  if (isLoading || user?.role === 'admin') return null;

  const alternar = async () => {
    if (!user) {
      router.push(`/login?volver=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setTrabajando(true);
    setError('');
    try {
      if (avisoId) {
        await quitarAviso(avisoId);
        setAvisoId(null);
      } else {
        setAvisoId((await avisarDisponibilidad(propiedadId))._id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar el aviso.');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={alternar}
        disabled={trabajando}
        aria-pressed={Boolean(avisoId)}
        className={`calma-micro flex items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[12px] transition-colors disabled:opacity-60 ${
          avisoId ? 'bg-[#efe9df] text-[#071733]' : 'border border-[#efe9df]/40 hover:border-[#efe9df]'
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={avisoId ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {avisoId ? 'Te avisamos cuando se libere' : 'Avisame cuando esté disponible'}
      </button>
      {avisoId && <p className="m-0 text-center text-[13px] text-[#efe9df]/60">Lo podés quitar desde acá o desde Mi cuenta.</p>}
      {error && (
        <p role="alert" className="m-0 text-center text-[13px] text-[#ffb4ad]">
          {error}
        </p>
      )}
    </div>
  );
}
