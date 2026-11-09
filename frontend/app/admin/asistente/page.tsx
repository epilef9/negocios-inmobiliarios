'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getAjustesAdmin, guardarAjustes, CONTACTO_PREDETERMINADO, type Contacto, type PreguntaFrecuente } from '@/services/ajustes';
import { getRequisitos, type Requisito } from '@/services/requisitos';
import { buscar, completar, PUNTOS_MINIMOS } from '@/components/sitio/asistente';
import { Alerta, Boton, Campo, Encabezado, Esqueleto, Tarjeta, areaTexto, control, useAviso } from '@/components/panel/ui';

// Panel → Configuración → Asistente de Contacto: las preguntas frecuentes que responde solo el asistente del sitio,
// con sus respuestas. A la derecha se prueba cómo respondería (con lo que está escrito, aunque todavía no se guardó).

// En el formulario las palabras clave se escriben separadas por coma
type PreguntaEditable = { pregunta: string; respuesta: string; palabras: string; enlaceTexto: string; enlaceHref: string };
const MAX_PREGUNTAS = 25;
const CUANTAS_BOTONES = 6;
const aEditable = (p: PreguntaFrecuente): PreguntaEditable => ({
  pregunta: p.pregunta,
  respuesta: p.respuesta,
  palabras: (p.palabras ?? []).join(', '),
  enlaceTexto: p.enlace?.texto ?? '',
  enlaceHref: p.enlace?.href ?? '',
});
const aGuardar = (p: PreguntaEditable): PreguntaFrecuente => ({
  pregunta: p.pregunta.trim(),
  respuesta: p.respuesta.trim(),
  palabras: p.palabras.split(',').map((x) => x.trim()).filter(Boolean),
  ...(p.enlaceTexto.trim() || p.enlaceHref.trim() ? { enlace: { texto: p.enlaceTexto.trim(), href: p.enlaceHref.trim() } } : {}),
});
const MARCAS = ['{horario}', '{direccion}', '{telefono}', '{email}', '{requisitos-alquilar}', '{requisitos-comprar}', '{requisitos-publicar}'];

// Prueba del asistente con las preguntas que están en pantalla
function Probar({ preguntas, contacto, requisitos }: { preguntas: PreguntaFrecuente[]; contacto: Contacto; requisitos: Requisito[] | null }) {
  const [consulta, setConsulta] = useState('');
  const [probada, setProbada] = useState('');
  const resultado = probada ? buscar(preguntas, probada)[0] : undefined;
  const encontro = resultado && resultado.puntos >= PUNTOS_MINIMOS;

  const probar = (e: FormEvent) => {
    e.preventDefault();
    setProbada(consulta.trim());
  };

  return (
    <Tarjeta guia="probar" titulo="Probá el asistente" descripcion="Escribí una pregunta como la haría un cliente y mirá qué respondería. Usa lo que está escrito a la izquierda, aunque no lo hayas guardado.">
      <form onSubmit={probar} className="flex flex-col gap-3">
        <Campo etiqueta="Pregunta de un cliente" htmlFor="probar-consulta">
          <input id="probar-consulta" value={consulta} maxLength={300} onChange={(e) => setConsulta(e.target.value)} placeholder="¿Qué necesito para alquilar?" className={control} />
        </Campo>
        <Boton type="submit" variante="principal" icono="buscar" disabled={!consulta.trim()} className="self-start">
          Probar
        </Boton>
      </form>
      {probada && (
        <div role="status" className="mt-4 flex flex-col gap-2 rounded-lg bg-panel-hundido p-4 text-[13.5px]">
          {encontro && resultado ? (
            <>
              <p className="m-0 text-[12.5px] font-medium text-panel-suave">Responde con «{resultado.pregunta.pregunta}»:</p>
              <p className="m-0 whitespace-pre-line leading-relaxed">{completar(resultado.pregunta.respuesta, { contacto, requisitos })}</p>
              {resultado.pregunta.enlace?.texto && <p className="m-0 text-panel-acento">{resultado.pregunta.enlace.texto} →</p>}
            </>
          ) : (
            <p className="m-0 leading-relaxed">
              No encuentra una respuesta: le ofrece al cliente escribirte por WhatsApp con la pregunta ya armada. Si te la hacen seguido, agregala o sumá palabras clave a una parecida.
            </p>
          )}
        </div>
      )}
    </Tarjeta>
  );
}

export default function AsistentePage() {
  const { mostrar, aviso } = useAviso();
  const [preguntas, setPreguntas] = useState<PreguntaEditable[] | null>(null);
  const [sugeridas, setSugeridas] = useState<PreguntaFrecuente[]>([]);
  const [contacto, setContacto] = useState<Contacto>(CONTACTO_PREDETERMINADO);
  const [requisitos, setRequisitos] = useState<Requisito[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getAjustesAdmin()
      .then((a) => {
        setPreguntas((a.preguntas ?? []).map(aEditable));
        setSugeridas(a.sugeridas ?? []);
        setContacto({ ...CONTACTO_PREDETERMINADO, ...a.contacto });
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las preguntas'));
    getRequisitos()
      .then(setRequisitos)
      .catch(() => {});
  }, []);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!preguntas) return;
    const incompleta = preguntas.findIndex((p) => !p.pregunta.trim() || !p.respuesta.trim());
    if (incompleta >= 0) {
      setAbierta(incompleta);
      return setErrorGuardar(`A la pregunta ${incompleta + 1} le falta ${preguntas[incompleta].pregunta.trim() ? 'la respuesta' : 'la pregunta'}.`);
    }
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const a = await guardarAjustes({ preguntas: preguntas.map(aGuardar) });
      setPreguntas((a.preguntas ?? []).map(aEditable));
      mostrar('Preguntas guardadas. El asistente de Contacto ya responde con estas.');
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const encabezado = (
    <Encabezado
      guia="asistente"
      volver={{ href: '/admin/configuracion', texto: 'Configuración' }}
      titulo="Asistente de Contacto"
      descripcion="Las preguntas que el asistente de la página Contacto responde solo, al instante. Lo que no sabe responder se lo manda a tu WhatsApp con la pregunta escrita."
    />
  );

  if (error) {
    return (
      <>
        {encabezado}
        <Alerta tono="peligro" titulo="No se pudieron cargar">
          {error}
        </Alerta>
      </>
    );
  }
  if (!preguntas) {
    return (
      <>
        {encabezado}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Esqueleto className="h-96 w-full" />
          <Esqueleto className="h-48 w-full" />
        </div>
      </>
    );
  }

  const cambiarPregunta = (i: number, cambio: Partial<PreguntaEditable>) => setPreguntas((ps) => ps && ps.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  const moverPregunta = (i: number, hacia: -1 | 1) => {
    setPreguntas((ps) => {
      if (!ps) return ps;
      const j = i + hacia;
      if (j < 0 || j >= ps.length) return ps;
      const copia = [...ps];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
    setAbierta((a) => (a === i ? i + hacia : a));
  };

  return (
    <>
      {encabezado}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={guardar}>
          <Tarjeta
            guia="preguntas"
            titulo={`Preguntas (${preguntas.length} de ${MAX_PREGUNTAS})`}
            descripcion={`Las primeras ${CUANTAS_BOTONES} se muestran como botones en Contacto. Tocá una para editarla y usá las flechas para ordenarlas.`}
            acciones={
              <Boton variante="principal" type="submit" cargando={guardando}>
                Guardar
              </Boton>
            }
          >
            {errorGuardar && (
              <div className="mb-4">
                <Alerta tono="peligro">{errorGuardar}</Alerta>
              </div>
            )}
            <p className="m-0 mb-4 text-sm text-panel-suave">
              En la respuesta podés usar marcas que se completan solas con los datos del sitio:{' '}
              {MARCAS.map((m, i) => (
                <span key={m}>
                  <code className="rounded bg-panel-fondo px-1 py-0.5 text-[12px]">{m}</code>
                  {i < MARCAS.length - 1 ? ' ' : '.'}
                </span>
              ))}{' '}
              Las palabras clave ayudan a encontrar la pregunta aunque la escriban distinto.
            </p>
            {preguntas.length === 0 && <p className="m-0 mb-4 text-sm text-panel-suave">No hay preguntas: el asistente solo va a ofrecer escribir por WhatsApp.</p>}
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {preguntas.map((p, i) => (
                <li key={i} className="rounded-lg border border-panel-borde">
                  <div className="flex items-center gap-2 p-2 pl-3">
                    <button
                      type="button"
                      aria-expanded={abierta === i}
                      onClick={() => setAbierta(abierta === i ? null : i)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
                    >
                      <span className="tabular w-5 shrink-0 text-panel-suave">{i + 1}.</span>
                      <span className="truncate">{p.pregunta || 'Pregunta nueva'}</span>
                    </button>
                    <Boton variante="fantasma" tamano="sm" icono="arriba" aria-label={`Subir «${p.pregunta || 'pregunta'}»`} disabled={i === 0} onClick={() => moverPregunta(i, -1)} />
                    <Boton variante="fantasma" tamano="sm" icono="abajo" aria-label={`Bajar «${p.pregunta || 'pregunta'}»`} disabled={i === preguntas.length - 1} onClick={() => moverPregunta(i, 1)} />
                    <Boton variante="fantasma" tamano="sm" icono="borrar" aria-label={`Quitar «${p.pregunta || 'pregunta'}»`} onClick={() => { setPreguntas((ps) => (ps ?? []).filter((_, j) => j !== i)); setAbierta(null); }} />
                  </div>
                  {abierta === i && (
                    <div className="grid gap-4 border-t border-panel-borde p-3 sm:grid-cols-2">
                      <Campo etiqueta="Pregunta" htmlFor={`pregunta-${i}`} className="sm:col-span-2">
                        <input id={`pregunta-${i}`} value={p.pregunta} maxLength={120} onChange={(e) => cambiarPregunta(i, { pregunta: e.target.value })} placeholder="¿Aceptan mascotas?" className={control} />
                      </Campo>
                      <Campo etiqueta="Respuesta" htmlFor={`respuesta-${i}`} className="sm:col-span-2" ayuda="Un renglón que empieza con «• » se muestra como lista.">
                        <textarea id={`respuesta-${i}`} rows={4} maxLength={800} value={p.respuesta} onChange={(e) => cambiarPregunta(i, { respuesta: e.target.value })} className={areaTexto} />
                      </Campo>
                      <Campo etiqueta="Palabras clave" htmlFor={`palabras-${i}`} className="sm:col-span-2" ayuda="Separadas por coma. Ej.: mascotas, perro, gato">
                        <input id={`palabras-${i}`} value={p.palabras} onChange={(e) => cambiarPregunta(i, { palabras: e.target.value })} className={control} />
                      </Campo>
                      <Campo etiqueta="Texto del enlace (opcional)" htmlFor={`enlace-texto-${i}`}>
                        <input id={`enlace-texto-${i}`} value={p.enlaceTexto} maxLength={60} onChange={(e) => cambiarPregunta(i, { enlaceTexto: e.target.value })} placeholder="Ver los requisitos" className={control} />
                      </Campo>
                      <Campo etiqueta="Adónde lleva" htmlFor={`enlace-href-${i}`} ayuda="Una página del sitio, como /requisitos">
                        <input id={`enlace-href-${i}`} value={p.enlaceHref} maxLength={200} onChange={(e) => cambiarPregunta(i, { enlaceHref: e.target.value })} placeholder="/requisitos" className={control} />
                      </Campo>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              {preguntas.length < MAX_PREGUNTAS && (
                <Boton tamano="sm" icono="mas" onClick={() => { setPreguntas((ps) => [...(ps ?? []), { pregunta: '', respuesta: '', palabras: '', enlaceTexto: '', enlaceHref: '' }]); setAbierta(preguntas.length); }}>
                  Agregar pregunta
                </Boton>
              )}
              <Boton tamano="sm" variante="fantasma" onClick={() => { setPreguntas(sugeridas.map(aEditable)); setAbierta(null); }}>
                Volver a las sugeridas
              </Boton>
            </div>
          </Tarjeta>
        </form>
        <div className="lg:sticky lg:top-6">
          <Probar preguntas={preguntas.map(aGuardar)} contacto={contacto} requisitos={requisitos} />
        </div>
      </div>
      {aviso}
    </>
  );
}
