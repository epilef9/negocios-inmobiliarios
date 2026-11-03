'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { resolveMapsLink } from '@/services/api';
import { getAjustesAdmin, guardarAjustes, type AjustesAdmin, type Banco, type Contacto, type Costos, type Lugar } from '@/services/ajustes';
import { Alerta, Boton, Campo, Encabezado, Esqueleto, Interruptor, Tarjeta, areaTexto, control, useAviso } from '@/components/panel/ui';

// HU-38 / RF-29: datos que se muestran en el sitio y se editan desde el panel. Cada tarjeta se guarda por separado.
//  - Contacto de la oficina (barra, pie, Contacto)
//  - Lugares de referencia para «a cuántas cuadras queda» en la ficha
//  - Costos de la calculadora «cuánto necesito para entrar»
//  - Datos bancarios para el pago por transferencia

type Seccion = 'contacto' | 'lugares' | 'costos' | 'banco';
const numero = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(',', '.')));

export default function SitioPage() {
  const { mostrar, aviso } = useAviso();
  const [datos, setDatos] = useState<AjustesAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<Seccion | null>(null);
  const [errores, setErrores] = useState<Partial<Record<Seccion, string>>>({});

  const [contacto, setContacto] = useState<Contacto | null>(null);
  // linkLeido: el último link que ya se convirtió en latitud y longitud (para no volver a leerlo al guardar)
  const [lugares, setLugares] = useState<(Omit<Lugar, 'latitud' | 'longitud'> & { latitud: string; longitud: string; link?: string; linkLeido?: string })[]>([]);
  const [costos, setCostos] = useState<Costos | null>(null);
  const [banco, setBanco] = useState<Banco | null>(null);

  const aplicar = (a: AjustesAdmin) => {
    setDatos(a);
    setContacto(a.contacto);
    setLugares(a.lugares.map((l) => ({ ...l, latitud: String(l.latitud), longitud: String(l.longitud) })));
    setCostos(a.costos);
    setBanco(a.banco);
  };

  useEffect(() => {
    getAjustesAdmin()
      .then(aplicar)
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar los datos del sitio'));
  }, []);

  const guardar = async (seccion: Seccion, cambios: Parameters<typeof guardarAjustes>[0], e?: FormEvent) => {
    e?.preventDefault();
    setGuardando(seccion);
    setErrores((x) => ({ ...x, [seccion]: undefined }));
    try {
      aplicar(await guardarAjustes(cambios));
      mostrar('Cambios guardados. Ya se ven en el sitio.');
    } catch (err) {
      setErrores((x) => ({ ...x, [seccion]: err instanceof Error ? err.message : 'No se pudo guardar' }));
    } finally {
      setGuardando(null);
    }
  };

  const completarDesdeLink = async (i: number) => {
    const link = lugares[i]?.link?.trim();
    if (!link || link === lugares[i]?.linkLeido) return;
    try {
      const { latitud, longitud } = await resolveMapsLink(link);
      setLugares((ls) => ls.map((l, j) => (j === i ? { ...l, latitud, longitud, linkLeido: link } : l)));
    } catch {
      setErrores((x) => ({ ...x, lugares: 'No pudimos leer ese link de Google Maps. Probá con el link de «Compartir» o escribí latitud y longitud.' }));
    }
  };

  // Al guardar con un link recién pegado (sin salir antes del campo) se lee ahí mismo: si no, se mandaba sin
  // coordenadas y el backend respondía que el punto no estaba en Entre Ríos
  const guardarLugares = async (e: FormEvent) => {
    e.preventDefault();
    setErrores((x) => ({ ...x, lugares: undefined }));
    setGuardando('lugares');
    const fallar = (mensaje: string) => {
      setErrores((x) => ({ ...x, lugares: mensaje }));
      setGuardando(null);
    };
    const listos = [];
    for (const l of lugares) {
      const link = l.link?.trim();
      let { latitud, longitud } = l;
      if (link && link !== l.linkLeido) {
        try {
          ({ latitud, longitud } = await resolveMapsLink(link));
        } catch {
          return fallar(`No pudimos leer el link de «${l.nombre || 'un lugar'}». Probá con el link de «Compartir» o escribí latitud y longitud.`);
        }
      }
      // Acepta la coma decimal: "-32,07" es lo mismo que "-32.07"
      const lat = Number(String(latitud).trim().replace(',', '.'));
      const lng = Number(String(longitud).trim().replace(',', '.'));
      if (!String(latitud).trim() || !String(longitud).trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return fallar(`Falta la ubicación de «${l.nombre || 'un lugar'}»: pegá su link de Google Maps o escribí latitud y longitud.`);
      }
      listos.push({ nombre: l.nombre, localidad: l.localidad, latitud: lat, longitud: lng });
    }
    await guardar('lugares', { lugares: listos });
  };

  if (error) {
    return (
      <>
        <Encabezado titulo="Datos del sitio" />
        <Alerta tono="peligro" titulo="No se pudieron cargar">
          {error}
        </Alerta>
      </>
    );
  }

  if (!datos || !contacto || !costos || !banco) {
    return (
      <>
        <Encabezado titulo="Datos del sitio" />
        <div className="flex max-w-4xl flex-col gap-4">
          <Esqueleto className="h-48 w-full" />
          <Esqueleto className="h-48 w-full" />
        </div>
      </>
    );
  }

  const campoTexto = (etiqueta: string, valor: string, cambiar: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}, ayuda?: string) => {
    const id = `sitio-${etiqueta.replace(/\W+/g, '-').toLowerCase()}`;
    return (
      <Campo etiqueta={etiqueta} htmlFor={id} ayuda={ayuda}>
        <input id={id} value={valor} onChange={(e) => cambiar(e.target.value)} className={control} {...props} />
      </Campo>
    );
  };

  const numeroCosto = (etiqueta: string, valor: number, cambiar: (n: number) => void, ayuda?: string) => {
    const id = `costo-${etiqueta.replace(/\W+/g, '-').toLowerCase()}`;
    return (
      <Campo etiqueta={etiqueta} htmlFor={id} ayuda={ayuda}>
        <input id={id} type="number" min="0" step="0.01" value={String(valor)} onChange={(e) => cambiar(numero(e.target.value))} className={`${control} tabular`} />
      </Campo>
    );
  };

  return (
    <>
      <Encabezado volver={{ href: '/admin/configuracion', texto: 'Configuración' }} titulo="Datos del sitio" descripcion="Lo que ven los clientes: contacto de la oficina, lugares de referencia, la calculadora de costos y los datos para transferir." />
      <div className="flex max-w-4xl flex-col gap-6">
        <form onSubmit={(e) => guardar('contacto', { contacto }, e)}>
          <Tarjeta
            titulo="Contacto de la oficina"
            descripcion="Se muestra en la barra de arriba, en el pie de todas las páginas y en Contacto."
            acciones={
              <Boton variante="principal" type="submit" cargando={guardando === 'contacto'}>
                Guardar
              </Boton>
            }
          >
            {errores.contacto && (
              <div className="mb-4">
                <Alerta tono="peligro">{errores.contacto}</Alerta>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {campoTexto('Teléfono', contacto.telefono, (v) => setContacto({ ...contacto, telefono: v }), { type: 'tel', maxLength: 40 })}
              {campoTexto('WhatsApp', contacto.whatsapp, (v) => setContacto({ ...contacto, whatsapp: v }), { inputMode: 'tel', maxLength: 20 }, 'Con 54 y la característica, sin 0 ni 15. Ej.: 543434469522')}
              {campoTexto('Email', contacto.email, (v) => setContacto({ ...contacto, email: v }), { type: 'email', maxLength: 150 })}
              {campoTexto('Instagram', contacto.instagram, (v) => setContacto({ ...contacto, instagram: v }), { maxLength: 60 }, 'El usuario, sin @')}
              {campoTexto('Dirección', contacto.direccion, (v) => setContacto({ ...contacto, direccion: v }), { maxLength: 120, required: true })}
              {campoTexto('Localidad', contacto.localidad, (v) => setContacto({ ...contacto, localidad: v }), { maxLength: 80 })}
            </div>
            <fieldset className="mt-6 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-2 text-sm font-medium">Horario de atención</legend>
              {contacto.horarios.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input aria-label={`Días, renglón ${i + 1}`} value={h.dias} maxLength={40} onChange={(e) => setContacto({ ...contacto, horarios: contacto.horarios.map((x, j) => (j === i ? { ...x, dias: e.target.value } : x)) })} placeholder="Lunes a viernes" className={control} />
                  <input aria-label={`Horas, renglón ${i + 1}`} value={h.horas} maxLength={60} onChange={(e) => setContacto({ ...contacto, horarios: contacto.horarios.map((x, j) => (j === i ? { ...x, horas: e.target.value } : x)) })} placeholder="9 a 13 h" className={control} />
                  <Boton variante="fantasma" icono="borrar" aria-label={`Quitar renglón ${i + 1}`} disabled={contacto.horarios.length <= 1} onClick={() => setContacto({ ...contacto, horarios: contacto.horarios.filter((_, j) => j !== i) })} />
                </div>
              ))}
              {contacto.horarios.length < 7 && (
                <Boton tamano="sm" icono="mas" className="self-start" onClick={() => setContacto({ ...contacto, horarios: [...contacto.horarios, { dias: '', horas: '' }] })}>
                  Agregar renglón
                </Boton>
              )}
            </fieldset>
          </Tarjeta>
        </form>

        <form onSubmit={guardarLugares}>
          <Tarjeta
            titulo="Lugares de referencia"
            descripcion="En la ficha de cada propiedad se muestra a cuántas cuadras queda de estos lugares (Universidad, Sanatorio, plaza, terminal…). Pegá el link de Google Maps de cada uno para tomar el punto exacto."
            acciones={
              <Boton variante="principal" type="submit" cargando={guardando === 'lugares'}>
                Guardar
              </Boton>
            }
          >
            {errores.lugares && (
              <div className="mb-4">
                <Alerta tono="peligro">{errores.lugares}</Alerta>
              </div>
            )}
            {lugares.length === 0 && <p className="m-0 mb-4 text-sm text-panel-suave">Todavía no cargaste lugares. Mientras no haya, la ficha no muestra distancias.</p>}
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {lugares.map((l, i) => (
                <li key={i} className="grid gap-2 rounded-lg border border-panel-borde p-3 sm:grid-cols-2">
                  <input aria-label="Nombre del lugar" value={l.nombre} maxLength={60} onChange={(e) => setLugares((ls) => ls.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} placeholder="Universidad Adventista del Plata" className={control} />
                  <input aria-label="Localidad" value={l.localidad} maxLength={80} onChange={(e) => setLugares((ls) => ls.map((x, j) => (j === i ? { ...x, localidad: e.target.value } : x)))} placeholder="Libertador San Martín" className={control} />
                  <input aria-label="Link de Google Maps" value={l.link ?? ''} onChange={(e) => setLugares((ls) => ls.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))} onBlur={() => completarDesdeLink(i)} placeholder="Link de Google Maps (opcional)" className={`${control} sm:col-span-2`} />
                  <input aria-label="Latitud" value={l.latitud} inputMode="decimal" onChange={(e) => setLugares((ls) => ls.map((x, j) => (j === i ? { ...x, latitud: e.target.value } : x)))} placeholder="Latitud, ej. -32.07" className={`${control} tabular`} />
                  <div className="flex gap-2">
                    <input aria-label="Longitud" value={l.longitud} inputMode="decimal" onChange={(e) => setLugares((ls) => ls.map((x, j) => (j === i ? { ...x, longitud: e.target.value } : x)))} placeholder="Longitud, ej. -60.46" className={`${control} tabular flex-1`} />
                    <Boton variante="fantasma" icono="borrar" aria-label={`Quitar ${l.nombre || 'lugar'}`} onClick={() => setLugares((ls) => ls.filter((_, j) => j !== i))} />
                  </div>
                </li>
              ))}
            </ul>
            {lugares.length < 15 && (
              <Boton tamano="sm" icono="mas" className="mt-4" onClick={() => setLugares((ls) => [...ls, { nombre: '', localidad: contacto.localidad, latitud: '', longitud: '' }])}>
                Agregar lugar
              </Boton>
            )}
          </Tarjeta>
        </form>

        <form onSubmit={(e) => guardar('costos', { costos }, e)}>
          <Tarjeta
            titulo="Calculadora «cuánto necesito para entrar»"
            descripcion="Aparece en la ficha de las propiedades en venta y alquiler cuando la publicás. Los honorarios y el sellado de alquiler se calculan sobre el total del contrato."
            acciones={
              <Boton variante="principal" type="submit" cargando={guardando === 'costos'}>
                Guardar
              </Boton>
            }
          >
            {errores.costos && (
              <div className="mb-4">
                <Alerta tono="peligro">{errores.costos}</Alerta>
              </div>
            )}
            <div className="mb-5">
              <Interruptor activo={costos.publicado} alCambiar={(v) => setCostos({ ...costos, publicado: v })} etiqueta="Mostrar la calculadora en el sitio">
                {costos.publicado ? 'Se muestra en el sitio' : 'Oculta: revisá los valores y activala'}
              </Interruptor>
            </div>
            <p className="m-0 mb-3 text-sm font-medium">Alquiler</p>
            <div className="grid gap-5 sm:grid-cols-4">
              {numeroCosto('Depósito (meses)', costos.alquiler.mesesDeposito, (n) => setCostos({ ...costos, alquiler: { ...costos.alquiler, mesesDeposito: n } }))}
              {numeroCosto('Honorarios (%)', costos.alquiler.honorariosPorcentaje, (n) => setCostos({ ...costos, alquiler: { ...costos.alquiler, honorariosPorcentaje: n } }))}
              {numeroCosto('Sellado (%)', costos.alquiler.selladoPorcentaje, (n) => setCostos({ ...costos, alquiler: { ...costos.alquiler, selladoPorcentaje: n } }), 'La parte del inquilino')}
              {numeroCosto('Gastos fijos (ARS)', costos.alquiler.gastosFijosARS, (n) => setCostos({ ...costos, alquiler: { ...costos.alquiler, gastosFijosARS: n } }), 'Informes, certificaciones')}
            </div>
            <p className="m-0 mb-3 mt-6 text-sm font-medium">Venta</p>
            <div className="grid gap-5 sm:grid-cols-3">
              {numeroCosto('Honorarios (%)', costos.venta.honorariosPorcentaje, (n) => setCostos({ ...costos, venta: { ...costos.venta, honorariosPorcentaje: n } }))}
              {numeroCosto('Escritura (%)', costos.venta.escrituraPorcentaje, (n) => setCostos({ ...costos, venta: { ...costos.venta, escrituraPorcentaje: n } }), 'Aproximado')}
              {numeroCosto('Seña habitual (%)', costos.venta.senaPorcentaje, (n) => setCostos({ ...costos, venta: { ...costos.venta, senaPorcentaje: n } }))}
            </div>
            <div className="mt-5">
              <Campo etiqueta="Aclaración que se muestra" htmlFor="costo-aclaracion">
                <textarea id="costo-aclaracion" rows={2} maxLength={300} value={costos.aclaracion} onChange={(e) => setCostos({ ...costos, aclaracion: e.target.value })} className={areaTexto} />
              </Campo>
            </div>
          </Tarjeta>
        </form>

        <form onSubmit={(e) => guardar('banco', { banco }, e)}>
          <Tarjeta
            titulo="Datos para transferencias"
            descripcion="Los ve solo el cliente que está pagando una reserva por transferencia. Sin titular y CBU o alias, esa opción no se ofrece."
            acciones={
              <Boton variante="principal" type="submit" cargando={guardando === 'banco'}>
                Guardar
              </Boton>
            }
          >
            {errores.banco && (
              <div className="mb-4">
                <Alerta tono="peligro">{errores.banco}</Alerta>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {campoTexto('Titular de la cuenta', banco.titular, (v) => setBanco({ ...banco, titular: v }), { maxLength: 120 })}
              {campoTexto('Banco', banco.banco, (v) => setBanco({ ...banco, banco: v }), { maxLength: 80 })}
              {campoTexto('CBU o CVU', banco.cbu, (v) => setBanco({ ...banco, cbu: v }), { inputMode: 'numeric', maxLength: 26 }, '22 números')}
              {campoTexto('Alias', banco.alias, (v) => setBanco({ ...banco, alias: v }), { maxLength: 20 })}
              {campoTexto('CUIT', banco.cuit, (v) => setBanco({ ...banco, cuit: v }), { inputMode: 'numeric', maxLength: 13 })}
            </div>
          </Tarjeta>
        </form>
      </div>
      {aviso}
    </>
  );
}
