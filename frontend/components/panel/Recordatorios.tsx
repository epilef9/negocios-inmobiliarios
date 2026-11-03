'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecordatoriosPanel, type RecordatoriosPanel } from '@/services/recordatorios';
import { getEstadisticas, type FilaEstadistica } from '@/services/estadisticas';
import Icono from './Icono';
import { Esqueleto, Insignia, Tarjeta } from './ui';

// Inicio del panel: lo mismo que mandan los recordatorios automáticos (visitas de mañana, contratos que vencen
// o actualizan precio) y las propiedades más vistas del mes.

const fila = 'flex items-center gap-3 px-5 py-3 hover:bg-panel-hundido';
const icono = 'h-[18px] w-[18px] shrink-0 text-panel-tenue';

// Quién y cuándo arriba, la propiedad en un segundo renglón: así la insignia de la derecha no corta el texto
function Renglones({ arriba, abajo }: { arriba: string; abajo: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{arriba}</span>
      <span className="truncate text-[13px] text-panel-suave">{abajo}</span>
    </span>
  );
}

export default function Recordatorios() {
  const [datos, setDatos] = useState<RecordatoriosPanel | null>(null);
  const [vistas, setVistas] = useState<FilaEstadistica[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    getRecordatoriosPanel()
      .then((d) => activo && setDatos(d))
      .catch(() => activo && setError(true));
    getEstadisticas(30)
      .then((r) => activo && setVistas(r.propiedades.filter((p) => p.vistas > 0).slice(0, 3)))
      .catch(() => activo && setVistas([]));
    return () => {
      activo = false;
    };
  }, []);

  if (error) return null;

  return (
    <>
      <Tarjeta titulo="Recordatorios" relleno={false}>
        {!datos ? (
          <div className="flex flex-col gap-2 p-5">
            <Esqueleto className="h-4 w-3/4" />
            <Esqueleto className="h-4 w-1/2" />
          </div>
        ) : !datos.visitasManana.length && !datos.porVencer.length && !datos.actualizan.length ? (
          <p className="m-0 px-5 py-4 text-[14px] text-panel-suave">Nada para mañana ni contratos para revisar.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-panel-borde p-0 text-[14px]">
            {datos.visitasManana.map((v) => (
              <li key={v.id}>
                <Link href="/admin/visitas" className={fila}>
                  <Icono nombre="visitas" className={icono} />
                  <Renglones arriba={`Mañana ${v.hora} h · ${v.cliente}`} abajo={v.propiedad} />
                  {v.avisado && <Insignia tono="exito" className="shrink-0">Avisado</Insignia>}
                </Link>
              </li>
            ))}
            {datos.porVencer.map((c) => (
              <li key={`v-${c.id}`}>
                <Link href="/admin/contratos" className={fila}>
                  <Icono nombre="documento" className={icono} />
                  <Renglones arriba={c.cliente} abajo={c.propiedad} />
                  <Insignia tono={c.dias !== undefined && c.dias <= 15 ? 'peligro' : 'aviso'} className="shrink-0">Vence en {c.dias} d</Insignia>
                </Link>
              </li>
            ))}
            {datos.actualizan.map((c) => (
              <li key={`a-${c.id}`}>
                <Link href="/admin/contratos" className={fila}>
                  <Icono nombre="reloj" className={icono} />
                  <Renglones arriba={c.cliente} abajo={c.propiedad} />
                  <Insignia tono="info" className="shrink-0">Actualiza este mes</Insignia>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {vistas && vistas.length > 0 && (
        <Tarjeta titulo="Más vistas del mes" relleno={false} acciones={<Link href="/admin/estadisticas" className="text-[13px] text-panel-suave hover:underline">Ver todo</Link>}>
          <ol className="m-0 list-none divide-y divide-panel-borde p-0 text-[14px]">
            {vistas.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="tabular w-4 text-panel-tenue">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p.titulo}</span>
                <span className="tabular text-[13px] text-panel-suave">{p.vistas} {p.vistas === 1 ? 'vista' : 'vistas'}</span>
              </li>
            ))}
          </ol>
        </Tarjeta>
      )}
    </>
  );
}
