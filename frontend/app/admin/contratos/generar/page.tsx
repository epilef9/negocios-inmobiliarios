'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createContrato, generarNumeroContrato, getContratoById, updateContrato, type ContratoInput, type EstadoContrato } from '@/services/contratos';
import { getProperties, type ApiProperty } from '@/services/api';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, Insignia, Tarjeta, areaTexto, control, useAviso } from '@/components/panel/ui';
import { ESTADO_CONTRATO, estadoDe } from '@/components/panel/estados';
import Icono from '@/components/panel/Icono';
import OpcionesPropiedad, { propiedadOfrecida } from '@/components/panel/OpcionesPropiedad';

const TIPOS = ['Alquiler permanente', 'Alquiler temporario', 'Comercial', 'Compraventa'] as const;
type TipoContrato = (typeof TIPOS)[number];
// Cada tipo de contrato usa su propio modelo de documento
const PLANTILLA_DE: Record<TipoContrato, string> = {
  'Alquiler permanente': 'Contrato de locación estándar',
  'Alquiler temporario': 'Contrato de locación temporaria',
  Comercial: 'Contrato comercial estándar',
  Compraventa: 'Boleto de compraventa',
};

// Qué contratos tienen sentido según cómo se publicó la propiedad
const tiposPara = (p?: ApiProperty): readonly TipoContrato[] => {
  if (!p?.categoria_operacion) return TIPOS;
  if (p.categoria_operacion === 'venta') return ['Compraventa'];
  if (p.categoria_operacion === 'temporario') return ['Alquiler temporario'];
  return p.tipo_inmueble === 'local' ? ['Comercial'] : ['Alquiler permanente'];
};

const miles = (n: number) => Math.round(n).toLocaleString('es-AR');
// Precio publicado, como punto de partida del monto del contrato
const precioDe = (p: ApiProperty) => {
  if (p.categoria_operacion === 'temporario' && p.precioPorNocheUSD) return `USD ${miles(p.precioPorNocheUSD)} por noche`;
  return p.moneda === 'ARS' ? `ARS ${miles(p.priceARS ?? p.price)}` : `USD ${miles(p.price)}`;
};
const AJUSTES = ['Semestral', 'Cuatrimestral', 'Trimestral', 'Anual'] as const;
const COMISIONES = ['3%', '4%', '5%'];

const TITULO_DOCUMENTO: Record<string, string> = {
  'Alquiler permanente': 'Contrato de locación',
  'Alquiler temporario': 'Contrato de locación temporaria',
  Comercial: 'Contrato de locación comercial',
  Compraventa: 'Boleto de compraventa',
};

// El backend guarda las fechas como "DD/MM/AAAA"; el campo de fecha del navegador usa "AAAA-MM-DD"
const aIso = (latina: string) => {
  const m = latina.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
};
const aLatina = (iso: string) => {
  const [anio, mes, dia] = iso.split('-');
  return iso ? `${dia}/${mes}/${anio}` : '';
};
const sumarMeses = (iso: string, meses: number) => {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setMonth(fecha.getMonth() + meses);
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
};
const FECHA_LARGA = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const ahoraTexto = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} hs`;
};

type Datos = {
  tipoContrato: TipoContrato;
  plantilla: string;
  propiedadId: string;
  propiedadTitulo: string;
  propiedadDireccion: string;
  propiedadCiudad: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  locadora: string;
  fechaInicio: string; // AAAA-MM-DD
  duracionMeses: string;
  montoMensual: string;
  depositoGarantia: string;
  ajuste: (typeof AJUSTES)[number];
  comision: string;
  incluyeGarante: boolean;
  observaciones: string;
};

const VACIO: Datos = {
  tipoContrato: 'Alquiler permanente',
  plantilla: PLANTILLA_DE['Alquiler permanente'],
  propiedadId: '',
  propiedadTitulo: '',
  propiedadDireccion: '',
  propiedadCiudad: '',
  clienteNombre: '',
  clienteTelefono: '',
  clienteEmail: '',
  locadora: 'Araceli Balbuena',
  fechaInicio: '',
  duracionMeses: '24',
  montoMensual: '',
  depositoGarantia: '',
  ajuste: 'Semestral',
  comision: '3%',
  incluyeGarante: true,
  observaciones: '',
};

// Lo que el documento muestra cuando un dato todavía no se cargó
function Hueco({ valor, texto }: { valor?: string; texto: string }) {
  return valor ? (
    <mark className="rounded bg-amber-100/70 px-0.5 text-inherit">{valor}</mark>
  ) : (
    <mark className="rounded bg-slate-200 px-1 text-slate-500">[{texto}]</mark>
  );
}

function enlaceWhatsApp(telefono: string, texto: string) {
  let numero = telefono.replace(/\D/g, '');
  if (!numero) return null;
  if (!numero.startsWith('54')) numero = `549${numero.replace(/^0/, '')}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function GeneradorContrato() {
  const id = useId();
  const parametro = useSearchParams().get('id');
  const [contratoId, setContratoId] = useState<string | null>(parametro);
  const [numero, setNumero] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoContrato | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
  const [cargando, setCargando] = useState(Boolean(parametro));
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [faltan, setFaltan] = useState<string[]>([]);
  const [guardando, setGuardando] = useState<'borrador' | 'activo' | null>(null);
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    getProperties()
      .then((lista) => setPropiedades(lista ?? []))
      .catch(() => setPropiedades([]));
  }, []);

  useEffect(() => {
    if (!parametro) return;
    getContratoById(parametro)
      .then((c) => {
        setNumero(c.numeroContrato);
        setEstado(c.estado);
        setUltimaActualizacion(c.ultimaActualizacion ?? null);
        setDatos({
          tipoContrato: (TIPOS as readonly string[]).includes(c.tipoContrato ?? '') ? (c.tipoContrato as Datos['tipoContrato']) : 'Alquiler permanente',
          plantilla: c.plantilla || PLANTILLA_DE['Alquiler permanente'],
          propiedadId: '',
          propiedadTitulo: c.propiedad?.titulo ?? '',
          propiedadDireccion: c.propiedad?.direccion ?? '',
          propiedadCiudad: '',
          clienteNombre: c.cliente?.nombre ?? '',
          clienteTelefono: c.cliente?.telefono ?? '',
          clienteEmail: c.cliente?.email ?? '',
          locadora: c.locadora || VACIO.locadora,
          fechaInicio: aIso(c.fechaInicio),
          duracionMeses: String(c.duracionMeses ?? 24),
          montoMensual: c.montoMensual ?? '',
          depositoGarantia: c.depositoGarantia ?? '',
          ajuste: (AJUSTES as readonly string[]).includes(c.ajuste ?? '') ? (c.ajuste as Datos['ajuste']) : 'Semestral',
          comision: c.comision || '3%',
          incluyeGarante: c.incluyeGarante ?? true,
          observaciones: c.observaciones ?? '',
        });
      })
      .catch((e: Error) => setErrorCarga(e.message || 'No se pudo cargar el contrato'))
      .finally(() => setCargando(false));
  }, [parametro]);

  // Al abrir un contrato guardado, se marca la propiedad del listado que coincide con su título
  const propiedadElegida = datos.propiedadId || propiedades.find((p) => p.title === datos.propiedadTitulo)?._id || '';

  const cambiar = <K extends keyof Datos>(campo: K, valor: Datos[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setFaltan((f) => f.filter((x) => x !== campo));
  };

  // Al elegir la propiedad se completan el tipo de contrato y el monto según cómo está publicada
  const elegirPropiedad = (idPropiedad: string) => {
    const p = propiedades.find((x) => x._id === idPropiedad);
    setDatos((d) => {
      const tipos = tiposPara(p);
      const tipoContrato = tipos.includes(d.tipoContrato) ? d.tipoContrato : tipos[0];
      return {
        ...d,
        propiedadId: idPropiedad,
        propiedadTitulo: p?.title ?? '',
        propiedadDireccion: p?.direccionCompleta || p?.location || '',
        propiedadCiudad: p?.ciudad ?? '',
        tipoContrato,
        plantilla: PLANTILLA_DE[tipoContrato],
        montoMensual: p ? precioDe(p) : d.montoMensual,
        duracionMeses: tipoContrato === 'Alquiler temporario' ? '1' : tipoContrato === 'Compraventa' ? '' : d.duracionMeses || '24',
      };
    });
    setFaltan((f) => f.filter((x) => x !== 'propiedadId' && x !== 'montoMensual'));
  };

  const cambiarTipo = (tipoContrato: TipoContrato) => {
    setDatos((d) => ({ ...d, tipoContrato, plantilla: PLANTILLA_DE[tipoContrato] }));
  };

  const esVenta = datos.tipoContrato === 'Compraventa';
  const esTemporario = datos.tipoContrato === 'Alquiler temporario';
  const propiedadActual = propiedades.find((p) => p._id === propiedadElegida);
  const tiposPosibles = tiposPara(propiedadActual);
  // Una compraventa no tiene plazo: la fecha es la de posesión
  const meses = esVenta ? 0 : Number(datos.duracionMeses) || 0;
  const fechaFin = esVenta ? (datos.fechaInicio ? aLatina(datos.fechaInicio) : '') : sumarMeses(datos.fechaInicio, meses);
  const parteDuena = esVenta ? 'parte vendedora' : 'parte locadora';
  const parteCliente = esVenta ? 'parte compradora' : 'parte locataria';
  const ciudad = datos.propiedadCiudad || 'Villa Libertador San Martín';
  // Domicilio sin partes repetidas (la dirección a veces ya trae la ciudad o la provincia)
  const domicilio = datos.propiedadDireccion || datos.propiedadCiudad
    ? [...datos.propiedadDireccion.split(','), datos.propiedadCiudad, 'Entre Ríos']
        .map((parte) => parte.trim())
        .filter((parte, i, todas) => parte && todas.findIndex((otra) => otra.toLowerCase() === parte.toLowerCase()) === i)
        .join(', ')
    : '';
  const tituloDocumento = TITULO_DOCUMENTO[datos.tipoContrato] ?? 'Contrato de locación';

  const revisar = () => {
    const pendientes: string[] = [];
    if (!datos.clienteNombre.trim()) pendientes.push('clienteNombre');
    if (!datos.clienteTelefono.trim()) pendientes.push('clienteTelefono');
    if (!datos.propiedadTitulo) pendientes.push('propiedadId');
    if (!datos.fechaInicio) pendientes.push('fechaInicio');
    if (!esVenta && !meses) pendientes.push('duracionMeses');
    if (!datos.montoMensual.trim()) pendientes.push('montoMensual');
    setFaltan(pendientes);
    return pendientes.length === 0;
  };

  const guardar = async (nuevoEstado: 'borrador' | 'activo') => {
    if (!revisar()) {
      mostrar('Faltan datos obligatorios: están marcados en el formulario.', 'peligro');
      return;
    }
    setGuardando(nuevoEstado);
    const marca = ahoraTexto();
    const campos: Omit<ContratoInput, 'numeroContrato'> = {
      cliente: { nombre: datos.clienteNombre.trim(), telefono: datos.clienteTelefono.trim(), email: datos.clienteEmail.trim() },
      propiedad: { titulo: datos.propiedadTitulo, direccion: domicilio || datos.propiedadTitulo },
      fechaInicio: aLatina(datos.fechaInicio),
      fechaFin,
      montoMensual: datos.montoMensual.trim(),
      estado: nuevoEstado,
      tipoContrato: datos.tipoContrato,
      plantilla: PLANTILLA_DE[datos.tipoContrato],
      duracionMeses: meses,
      depositoGarantia: esVenta ? '' : datos.depositoGarantia.trim(),
      ajuste: esVenta || esTemporario ? 'Sin ajuste' : datos.ajuste,
      comision: datos.comision,
      incluyeGarante: !esVenta && datos.incluyeGarante,
      observaciones: datos.observaciones.trim(),
      locadora: datos.locadora.trim(),
      ultimaActualizacion: marca,
    };
    try {
      if (contratoId) {
        // Al editar no se manda el número, para no chocar con el índice único
        await updateContrato(contratoId, campos);
      } else {
        const nuevoNumero = generarNumeroContrato();
        const creado = await createContrato({ ...campos, numeroContrato: nuevoNumero });
        // Desde ahora se edita este mismo contrato: guardar otra vez ya no crea uno nuevo
        setContratoId(creado._id);
        setNumero(creado.numeroContrato || nuevoNumero);
        window.history.replaceState(null, '', `/admin/contratos/generar?id=${creado._id}`);
      }
      setEstado(nuevoEstado);
      setUltimaActualizacion(marca);
      mostrar(nuevoEstado === 'borrador' ? 'Borrador guardado.' : 'Contrato guardado como activo. Ya podés imprimirlo o enviarlo.');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo guardar el contrato', 'peligro');
    } finally {
      setGuardando(null);
    }
  };

  const textoEnvio = `Hola ${datos.clienteNombre}, te escribimos de Negocios Inmobiliarios por el ${tituloDocumento.toLowerCase()} de "${datos.propiedadTitulo}". Te lo adjuntamos para que lo revises.`;
  const whatsapp = enlaceWhatsApp(datos.clienteTelefono, textoEnvio);
  const correo = datos.clienteEmail
    ? `mailto:${datos.clienteEmail}?subject=${encodeURIComponent(`${tituloDocumento} - ${datos.propiedadTitulo}`)}&body=${encodeURIComponent(textoEnvio)}`
    : null;

  const error = (campo: string, texto: string) => (faltan.includes(campo) ? texto : null);

  if (cargando) {
    return (
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-10 w-72" />
        <Esqueleto className="h-[520px] w-full" />
      </div>
    );
  }

  const estadoActual = estado ? estadoDe(ESTADO_CONTRATO, estado) : null;

  return (
    <>
      <Encabezado
        titulo={numero ? `Contrato ${numero}` : 'Nuevo contrato'}
        volver={{ href: '/admin/contratos', texto: 'Contratos' }}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {estadoActual ? <Insignia tono={estadoActual.tono}>{estadoActual.texto}</Insignia> : <span>Sin guardar</span>}
            {ultimaActualizacion && <span className="text-panel-tenue">Guardado {ultimaActualizacion}</span>}
          </span>
        }
        acciones={
          <>
            <Boton onClick={() => guardar('borrador')} cargando={guardando === 'borrador'} disabled={Boolean(guardando)}>
              Guardar borrador
            </Boton>
            <Boton variante="principal" icono="check" onClick={() => guardar('activo')} cargando={guardando === 'activo'} disabled={Boolean(guardando)}>
              Guardar como activo
            </Boton>
          </>
        }
      />

      {errorCarga && (
        <div className="mb-6">
          <Alerta tono="peligro" titulo="No se pudo abrir el contrato">
            {errorCarga}. Podés volver al listado o empezar uno nuevo.
          </Alerta>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Tarjeta titulo="Partes y propiedad">
            <div className="grid gap-4">
              <Campo etiqueta="Propiedad *" htmlFor={`${id}-prop`} error={error('propiedadId', 'Elegí la propiedad.')}>
                <select id={`${id}-prop`} value={propiedadElegida} aria-invalid={faltan.includes('propiedadId')} onChange={(e) => elegirPropiedad(e.target.value)} className={control}>
                  <option value="">{datos.propiedadTitulo && !propiedadElegida ? `${datos.propiedadTitulo} (guardada)` : 'Elegí una propiedad'}</option>
                  <OpcionesPropiedad propiedades={propiedades.filter((p) => propiedadOfrecida(p) || p._id === propiedadElegida)} />
                </select>
              </Campo>
              <Campo etiqueta="Nombre del cliente *" htmlFor={`${id}-cli`} error={error('clienteNombre', 'Escribí el nombre del cliente.')}>
                <input id={`${id}-cli`} type="text" value={datos.clienteNombre} aria-invalid={faltan.includes('clienteNombre')} onChange={(e) => cambiar('clienteNombre', e.target.value)} className={control} />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Teléfono *" htmlFor={`${id}-tel`} error={error('clienteTelefono', 'Escribí el teléfono.')}>
                  <input id={`${id}-tel`} type="tel" value={datos.clienteTelefono} aria-invalid={faltan.includes('clienteTelefono')} onChange={(e) => cambiar('clienteTelefono', e.target.value)} placeholder="Ej.: 343 444 4444" className={control} />
                </Campo>
                <Campo etiqueta="Email" htmlFor={`${id}-mail`}>
                  <input id={`${id}-mail`} type="email" value={datos.clienteEmail} onChange={(e) => cambiar('clienteEmail', e.target.value)} className={control} />
                </Campo>
              </div>
              <Campo etiqueta={esVenta ? 'Parte vendedora' : 'Parte locadora'} htmlFor={`${id}-loc`} ayuda={esVenta ? 'Quien vende la propiedad.' : 'Quien alquila la propiedad (dueño/a o apoderado/a).'}>
                <input id={`${id}-loc`} type="text" value={datos.locadora} onChange={(e) => cambiar('locadora', e.target.value)} className={control} />
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Condiciones">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Tipo de contrato" htmlFor={`${id}-tipo`} ayuda={propiedadActual ? 'Según cómo está publicada la propiedad.' : undefined}>
                <select id={`${id}-tipo`} value={datos.tipoContrato} disabled={tiposPosibles.length === 1} onChange={(e) => cambiarTipo(e.target.value as TipoContrato)} className={control}>
                  {tiposPosibles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta={esVenta ? 'Fecha de posesión *' : 'Fecha de inicio *'} htmlFor={`${id}-inicio`} error={error('fechaInicio', 'Elegí la fecha.')}>
                <input id={`${id}-inicio`} type="date" value={datos.fechaInicio} aria-invalid={faltan.includes('fechaInicio')} onChange={(e) => cambiar('fechaInicio', e.target.value)} className={control} />
              </Campo>
              {!esVenta && (
                <Campo etiqueta="Duración (meses) *" htmlFor={`${id}-meses`} error={error('duracionMeses', 'Indicá la duración.')} ayuda={fechaFin ? `Termina el ${fechaFin}` : undefined}>
                  <input id={`${id}-meses`} type="number" min="1" value={datos.duracionMeses} aria-invalid={faltan.includes('duracionMeses')} onChange={(e) => cambiar('duracionMeses', e.target.value)} className={`${control} tabular`} />
                </Campo>
              )}
              <Campo etiqueta={esVenta ? 'Precio de venta *' : esTemporario ? 'Precio *' : 'Monto mensual *'} htmlFor={`${id}-monto`} error={error('montoMensual', 'Indicá el monto.')}>
                <input id={`${id}-monto`} type="text" value={datos.montoMensual} aria-invalid={faltan.includes('montoMensual')} onChange={(e) => cambiar('montoMensual', e.target.value)} placeholder="Ej.: ARS 350.000" className={control} />
              </Campo>
              {!esVenta && (
                <Campo etiqueta="Depósito en garantía" htmlFor={`${id}-deposito`}>
                  <input id={`${id}-deposito`} type="text" value={datos.depositoGarantia} onChange={(e) => cambiar('depositoGarantia', e.target.value)} placeholder="Ej.: ARS 350.000" className={control} />
                </Campo>
              )}
              {!esVenta && !esTemporario && (
                <Campo etiqueta="Ajuste del alquiler" htmlFor={`${id}-ajuste`}>
                  <select id={`${id}-ajuste`} value={datos.ajuste} onChange={(e) => cambiar('ajuste', e.target.value as Datos['ajuste'])} className={control}>
                    {AJUSTES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Campo>
              )}
              <Campo etiqueta="Comisión" htmlFor={`${id}-comision`}>
                <select id={`${id}-comision`} value={datos.comision} onChange={(e) => cambiar('comision', e.target.value)} className={control}>
                  {COMISIONES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
              {!esVenta && (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-panel-borde p-3 sm:col-span-2">
                  <input type="checkbox" checked={datos.incluyeGarante} onChange={(e) => cambiar('incluyeGarante', e.target.checked)} className="h-4 w-4 accent-[var(--p-acento)]" />
                  <span className="text-sm">Incluye garante (agrega la cláusula de fianza)</span>
                </label>
              )}
              <Campo etiqueta="Observaciones" htmlFor={`${id}-obs`} ayuda="Si escribís algo, aparece como cláusula en el contrato." className="sm:col-span-2">
                <textarea id={`${id}-obs`} rows={3} value={datos.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} className={areaTexto} />
              </Campo>
            </div>
          </Tarjeta>
        </div>

        <Tarjeta
          titulo="Vista previa"
          descripcion="Se actualiza mientras completás el formulario."
          acciones={
            <>
              <Boton tamano="sm" icono="imprimir" onClick={() => window.print()}>
                Imprimir o guardar PDF
              </Boton>
              <Boton tamano="sm" variante="principal" icono="telefono" onClick={() => setEnviarAbierto(true)} disabled={!contratoId}>
                Enviar al cliente
              </Boton>
            </>
          }
          className="xl:sticky xl:top-6 xl:self-start"
        >
          {!contratoId && <p className="m-0 mb-4 text-[13px] text-panel-suave">Guardalo primero para poder enviarlo.</p>}
          <div className="max-h-[75vh] overflow-auto rounded-lg bg-panel-hundido p-3 sm:p-6">
            <article id="documento-contrato" className="mx-auto max-w-[680px] bg-white px-8 py-10 font-serif [&>p]:my-3 text-[14.5px] leading-[1.75] text-slate-900 shadow-sm sm:px-12">
              <h2 className="m-0 mb-1 text-center text-[17px] font-bold uppercase tracking-[0.12em]">{tituloDocumento}</h2>
              {numero && <p className="m-0 mb-6 text-center text-[12.5px] text-slate-500">N.º {numero}</p>}
              <p>
                Entre <Hueco valor={datos.locadora} texto={parteDuena} />, en adelante «LA {parteDuena.toUpperCase()}», y <Hueco valor={datos.clienteNombre} texto="cliente" />, en adelante «LA {parteCliente.toUpperCase()}», se celebra el presente {esVenta ? 'boleto' : 'contrato'} sobre el inmueble ubicado en{' '}
                <Hueco valor={domicilio} texto="propiedad" />, sujeto a las siguientes cláusulas:
              </p>
              {esVenta ? (
                <>
                  <p>
                    <strong>PRIMERA:</strong> La parte vendedora vende a la parte compradora, y esta acepta, el inmueble descripto, libre de ocupantes, gravámenes y deudas, con entrega de la posesión el <Hueco valor={datos.fechaInicio ? aLatina(datos.fechaInicio) : ''} texto="fecha de posesión" />.
                  </p>
                  <p>
                    <strong>SEGUNDA:</strong> El precio total y definitivo se fija en <Hueco valor={datos.montoMensual} texto="precio" />. La escritura traslativa de dominio se otorgará ante el escribano que designe la parte compradora dentro de los 60 días de la firma del presente.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>PRIMERA:</strong> El plazo se establece en <Hueco valor={meses ? `${meses} ${meses === 1 ? 'mes' : 'meses'}` : ''} texto="duración" />, a partir del <Hueco valor={datos.fechaInicio ? aLatina(datos.fechaInicio) : ''} texto="fecha de inicio" />
                    {fechaFin ? <>, con vencimiento el <Hueco valor={fechaFin} texto="" /></> : null}.
                  </p>
                  <p>
                    {esTemporario ? (
                      <>
                        <strong>SEGUNDA:</strong> El precio se fija en <Hueco valor={datos.montoMensual} texto="precio" />, que se abona por adelantado al ingresar al inmueble.
                      </>
                    ) : (
                      <>
                        <strong>SEGUNDA:</strong> El precio se fija en <Hueco valor={datos.montoMensual} texto="monto" /> mensuales, pagaderos dentro de los primeros 5 días de cada mes. El ajuste será de periodicidad <strong>{datos.ajuste.toLowerCase()}</strong>.
                      </>
                    )}
                  </p>
                </>
              )}
              {!esVenta && datos.depositoGarantia && (
                <p>
                  <strong>TERCERA:</strong> Se establece un depósito en garantía de <Hueco valor={datos.depositoGarantia} texto="" />, que será restituido al finalizar el contrato siempre que el inmueble se devuelva en las mismas condiciones en que fue entregado.
                </p>
              )}
              {!esVenta && datos.incluyeGarante && (
                <p>
                  <strong>{datos.depositoGarantia ? 'CUARTA' : 'TERCERA'}:</strong> La parte locataria presenta garantía debidamente conformada; el fiador se constituye en principal pagador y responde solidariamente por todas las obligaciones de este contrato.
                </p>
              )}
              <p>
                <strong>COMISIÓN:</strong> La intermediación de Negocios Inmobiliarios devenga una comisión del {datos.comision}.
              </p>
              {datos.observaciones.trim() && (
                <p className="whitespace-pre-line">
                  <strong>OBSERVACIONES:</strong> {datos.observaciones.trim()}
                </p>
              )}
              <p className="mt-6">
                En prueba de conformidad se firman dos ejemplares de un mismo tenor, en {ciudad}, Entre Ríos, a los {FECHA_LARGA.format(new Date())}.
              </p>
              <div className="mt-16 grid grid-cols-2 gap-10 text-center text-[13px]">
                <div>
                  <div className="mb-2 border-t border-slate-400" />
                  <span className="block font-semibold">{datos.locadora || ' '}</span>
                  <span className="text-slate-500">{esVenta ? 'Parte vendedora' : 'Parte locadora'}</span>
                </div>
                <div>
                  <div className="mb-2 border-t border-slate-400" />
                  <span className="block font-semibold">{datos.clienteNombre || ' '}</span>
                  <span className="text-slate-500">{esVenta ? 'Parte compradora' : 'Parte locataria'}</span>
                </div>
              </div>
            </article>
          </div>
        </Tarjeta>
      </div>

      <Dialogo
        abierto={enviarAbierto}
        alCerrar={() => setEnviarAbierto(false)}
        titulo="Enviar al cliente"
        descripcion="Primero guardá el PDF con «Imprimir o guardar PDF» para adjuntarlo."
      >
        <div className="flex flex-col gap-2">
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => setEnviarAbierto(false)} className="flex items-center gap-3 rounded-lg border border-panel-borde p-3 hover:bg-panel-hundido">
              <Icono nombre="telefono" className="h-5 w-5 text-emerald-600" />
              <span className="flex-1">
                <span className="block text-sm font-medium">WhatsApp</span>
                <span className="tabular block text-[13px] text-panel-suave">{datos.clienteTelefono}</span>
              </span>
              <Icono nombre="flecha" className="h-4 w-4 text-panel-tenue" />
            </a>
          ) : (
            <p className="m-0 text-sm text-panel-suave">Cargá el teléfono del cliente para escribirle por WhatsApp.</p>
          )}
          {correo ? (
            <a href={correo} onClick={() => setEnviarAbierto(false)} className="flex items-center gap-3 rounded-lg border border-panel-borde p-3 hover:bg-panel-hundido">
              <Icono nombre="contratos" className="h-5 w-5 text-panel-suave" />
              <span className="flex-1">
                <span className="block text-sm font-medium">Email</span>
                <span className="block text-[13px] text-panel-suave">{datos.clienteEmail}</span>
              </span>
              <Icono nombre="flecha" className="h-4 w-4 text-panel-tenue" />
            </a>
          ) : (
            <p className="m-0 text-sm text-panel-suave">Cargá el email del cliente para mandárselo por correo.</p>
          )}
        </div>
      </Dialogo>

      {aviso}
    </>
  );
}

export default function GenerarContratoPage() {
  return (
    <Suspense fallback={<Esqueleto className="h-96 w-full" />}>
      <GeneradorContrato />
    </Suspense>
  );
}
