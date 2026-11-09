'use client';

import { useEffect, useState } from 'react';
import { Boton, Campo, Encabezado, EstadoVacio, Insignia, Tarjeta, control, useAviso } from '@/components/panel/ui';
import { createRequisito, deleteRequisito, getRequisitosAdmin, updateRequisito, type OperacionRequisito, type Requisito } from '@/services/requisitos';

const OPERACIONES: { id: OperacionRequisito; texto: string }[] = [
  { id: 'alquilar', texto: 'Alquilar' },
  { id: 'comprar', texto: 'Comprar' },
  { id: 'publicar', texto: 'Publicar' },
];

export default function AdminRequisitosPage() {
  const [lista, setLista] = useState<Requisito[]>([]);
  const [operacion, setOperacion] = useState<OperacionRequisito>('alquilar');
  const [seccion, setSeccion] = useState('');
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    let vigente = true;
    getRequisitosAdmin()
      .then((requisitos) => {
        if (vigente) setLista(requisitos);
      })
      .catch((error) => {
        if (vigente) mostrar(error instanceof Error ? error.message : 'No se pudieron cargar los requisitos', 'peligro');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [mostrar]);

  const limpiar = () => {
    setSeccion('');
    setTexto('');
    setEditando(null);
  };

  const guardar = async () => {
    if (!seccion.trim() || !texto.trim()) return;
    try {
      if (editando) {
        const actualizado = await updateRequisito(editando, { operacion, seccion: seccion.trim(), texto: texto.trim() });
        setLista((actual) => actual.map((item) => item._id === editando ? actualizado : item));
        mostrar('Requisito actualizado.');
      } else {
        const creado = await createRequisito({ operacion, seccion: seccion.trim(), texto: texto.trim(), orden: lista.length, activo: true });
        setLista((actual) => [...actual, creado]);
        mostrar('Requisito agregado.');
      }
      limpiar();
    } catch (error) {
      mostrar(error instanceof Error ? error.message : 'No se pudo guardar el requisito', 'peligro');
    }
  };

  const editar = (item: Requisito) => {
    setEditando(item._id);
    setOperacion(item.operacion);
    setSeccion(item.seccion);
    setTexto(item.texto);
  };

  const eliminar = async (item: Requisito) => {
    if (!confirm(`¿Eliminar "${item.texto}"?`)) return;
    try {
      await deleteRequisito(item._id);
      setLista((actual) => actual.filter((value) => value._id !== item._id));
      mostrar('Requisito eliminado.');
    } catch (error) {
      mostrar(error instanceof Error ? error.message : 'No se pudo eliminar el requisito', 'peligro');
    }
  };

  return (
    <>
      <Encabezado titulo="Requisitos" descripcion="Administrá las listas que aparecen en la página pública." />
      <Tarjeta titulo={editando ? 'Editar requisito' : 'Agregar requisito'} acciones={editando ? <Boton tamano="sm" onClick={limpiar}>Cancelar</Boton> : undefined}>
        <div className="grid gap-4 md:grid-cols-[180px_1fr_2fr_auto] md:items-end">
          <Campo etiqueta="Operación" htmlFor="requisito-operacion">
            <select id="requisito-operacion" className={control} value={operacion} onChange={(event) => setOperacion(event.target.value as OperacionRequisito)}>
              {OPERACIONES.map((item) => <option key={item.id} value={item.id}>{item.texto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Sección" htmlFor="requisito-seccion">
            <input id="requisito-seccion" className={control} value={seccion} onChange={(event) => setSeccion(event.target.value)} placeholder="Documentación" />
          </Campo>
          <Campo etiqueta="Texto" htmlFor="requisito-texto">
            <input id="requisito-texto" className={control} value={texto} onChange={(event) => setTexto(event.target.value)} placeholder="DNI del titular..." />
          </Campo>
          <Boton variante="principal" onClick={guardar} disabled={!seccion.trim() || !texto.trim()}>{editando ? 'Guardar' : 'Agregar'}</Boton>
        </div>
      </Tarjeta>

      <Tarjeta className="mt-5" titulo={`${lista.length} requisitos`}>
        {cargando ? <p className="m-0 text-sm text-panel-suave">Cargando…</p> : lista.length === 0 ? <EstadoVacio titulo="No hay requisitos" /> : (
          <div className="divide-y divide-panel-borde">
            {lista.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Insignia tono="info">{OPERACIONES.find((op) => op.id === item.operacion)?.texto}</Insignia>
                <span className="text-sm font-medium">{item.seccion}</span>
                <span className="min-w-0 flex-1 text-sm text-panel-suave">{item.texto}</span>
                <Boton tamano="sm" onClick={() => editar(item)}>Editar</Boton>
                <Boton tamano="sm" variante="peligro" onClick={() => eliminar(item)}>Eliminar</Boton>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
      {aviso}
    </>
  );
}
