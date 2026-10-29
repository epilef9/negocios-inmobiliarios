'use client';

import { useState, useId, useRef, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import SitioBase from '@/components/sitio/SitioBase';
import { useAuth } from '@/context/AuthContext';
import { GUIAS } from '@/components/requisitos/datos';
import { useChecklist } from '@/components/requisitos/useChecklist';
import {
  enviarSolicitudPublicacion,
  subirFotosPublicacion,
  subirDocumentosPublicacion,
  type CrearSolicitudPayload,
} from '@/services/solicitudesPublicacion';

const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
const selector =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-[#071733] py-3 text-[18px] text-[#efe9df] transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
const botonPrincipal =
  'calma-micro inline-flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-8 py-4 text-[13px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';
const botonLinea =
  'calma-micro inline-flex items-center justify-center rounded-full border border-[#efe9df]/40 px-6 py-3.5 text-[12px] text-[#efe9df] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/10';
const tituloSeccion = 'font-display m-0 text-[26px] font-normal text-[#efe9df]';

// Solo se trabaja con estas operaciones, tipos y localidades (todas en Entre Ríos)
const OPERACIONES = [
  ['venta', 'Venta'],
  ['alquiler', 'Alquiler'],
  ['temporario', 'Alquiler temporario / por día'],
] as const;
const TIPOS = [
  ['casa', 'Casa'],
  ['departamento', 'Departamento'],
  ['terreno', 'Terreno / Lote'],
  ['local', 'Local comercial'],
] as const;
const LOCALIDADES = ['Villa Libertador San Martín', 'Crespo', 'Diamante'] as const;
const PROVINCIA = 'Entre Ríos';
type TipoPropiedad = (typeof TIPOS)[number][0];

const COMODIDADES = [
  ['patio', 'Patio'], ['parque', 'Parque'], ['quincho', 'Quincho'],
  ['pileta', 'Pileta'], ['lavadero', 'Lavadero'], ['balcon', 'Balcón'],
  ['amoblado', 'Amoblado'], ['aire_acondicionado', 'Aire acondicionado'],
] as const;

const DOCUMENTOS = [
  { clave: 'dni', nombre: 'DNI del propietario', ayuda: 'Frente y dorso en un mismo archivo o foto.', obligatorio: true },
  { clave: 'escritura', nombre: 'Escritura o título de propiedad', ayuda: 'La que acredita que sos el dueño.', obligatorio: true },
  { clave: 'impuestos', nombre: 'Impuestos y servicios al día', ayuda: 'El último comprobante pago.', obligatorio: true },
  { clave: 'planos', nombre: 'Planos de la propiedad', ayuda: 'Si los tenés.', obligatorio: false },
  { clave: 'reglamento', nombre: 'Reglamento de copropiedad', ayuda: 'Solo si es un departamento o está en un edificio.', obligatorio: false },
] as const;
type DocumentoId = (typeof DOCUMENTOS)[number]['clave'];

const MAX_FOTOS = 15;
const MAX_DOCUMENTO = 4 * 1024 * 1024;

interface FotoLocal {
  id: string;
  file: File;
  previewUrl: string;
}

const pesoLegible = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function PublicarPropiedadPage() {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avisoRef = useRef<HTMLDivElement>(null);
  const { user, isLoading } = useAuth();
  const { marcas: requisitosMarcados, estado: estadoRequisitos } = useChecklist();
  const requisitosPublicar = GUIAS.find((guia) => guia.id === 'publicar')?.secciones.flatMap((seccion) => seccion.items) ?? [];
  const requisitosCompletos = requisitosPublicar.every((requisito) => requisitosMarcados[requisito.id]);

  const [tipoPropiedad, setTipoPropiedad] = useState<TipoPropiedad>('casa');
  const [operacion, setOperacion] = useState('venta');
  const [titulo, setTitulo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState<string>(LOCALIDADES[0]);
  const [referenciasUbicacion, setReferenciasUbicacion] = useState('');
  const [ambientes, setAmbientes] = useState('2');
  const [dormitorios, setDormitorios] = useState('1');
  const [banos, setBanos] = useState('1');
  const [superficieTotal, setSuperficieTotal] = useState('');
  const [superficieCubierta, setSuperficieCubierta] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');
  const [descripcion, setDescripcion] = useState('');
  const [expensas, setExpensas] = useState<'' | 'si' | 'no'>('');
  const [montoExpensas, setMontoExpensas] = useState('');
  const [cochera, setCochera] = useState('no');
  const [pisoUnidad, setPisoUnidad] = useState('');
  const [comodidades, setComodidades] = useState<string[]>([]);
  const [otrasComodidades, setOtrasComodidades] = useState('');

  const esTerreno = tipoPropiedad === 'terreno';
  const tieneDormitorios = tipoPropiedad === 'casa' || tipoPropiedad === 'departamento';
  const esDepartamento = tipoPropiedad === 'departamento';

  // Fotos y documentos, cada cosa por separado
  const [fotosLocales, setFotosLocales] = useState<FotoLocal[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [fotosTexto, setFotosTexto] = useState('');
  const [documentos, setDocumentos] = useState<Partial<Record<DocumentoId, File>>>({});
  const [mostrarUrlsExtra, setMostrarUrlsExtra] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [campoConError, setCampoConError] = useState<string | null>(null);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);

  // El aviso queda arriba del formulario: se lleva la pantalla hasta ahí para que siempre se vea
  const mostrarError = (mensaje: string, campo: string | null = null) => {
    setError(mensaje);
    setCampoConError(campo);
    requestAnimationFrame(() => {
      const aviso = avisoRef.current;
      if (!aviso) return;
      const destino = aviso.getBoundingClientRect().top + window.scrollY - 120;
      if (window.__lenis) window.__lenis.scrollTo(destino);
      else {
        const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: destino, behavior: quieto ? 'auto' : 'smooth' });
      }
      aviso.focus({ preventScroll: true });
    });
  };
  const limpiarError = () => {
    setError(null);
    setCampoConError(null);
  };
  const invalido = (campo: string) => (campoConError === campo ? true : undefined);

  const agregarArchivos = (nuevos: FileList | File[]) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    const validos = Array.from(nuevos).filter((f) => permitidos.includes(f.type));

    if (validos.length === 0) {
      mostrarError('Solo se aceptan fotos en formato JPG, PNG, WEBP o GIF.', 'fotos');
      return;
    }
    if (fotosLocales.length + validos.length > MAX_FOTOS) {
      mostrarError(`Podés subir hasta ${MAX_FOTOS} fotos como máximo.`, 'fotos');
      return;
    }

    limpiarError();
    const mapeados: FotoLocal[] = validos.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setFotosLocales((prev) => [...prev, ...mapeados]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) agregarArchivos(e.dataTransfer.files);
  };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) agregarArchivos(e.target.files);
    e.target.value = '';
  };

  const eliminarFoto = (idFoto: string) => {
    setFotosLocales((prev) => {
      const encontrada = prev.find((f) => f.id === idFoto);
      if (encontrada) URL.revokeObjectURL(encontrada.previewUrl);
      return prev.filter((f) => f.id !== idFoto);
    });
  };

  const elegirDocumento = (clave: DocumentoId, archivo: File | undefined) => {
    if (!archivo) return;
    const permitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!permitidos.includes(archivo.type)) {
      mostrarError('Cada documento tiene que ser un PDF o una foto JPG, PNG o WEBP.', `doc-${clave}`);
      return;
    }
    if (archivo.size > MAX_DOCUMENTO) {
      mostrarError('Cada documento puede pesar hasta 4 MB.', `doc-${clave}`);
      return;
    }
    limpiarError();
    setDocumentos((actual) => ({ ...actual, [clave]: archivo }));
  };

  const quitarDocumento = (clave: DocumentoId) => {
    setDocumentos((actual) => {
      const copia = { ...actual };
      delete copia[clave];
      return copia;
    });
  };

  // Si carga un monto de expensas, queda marcado que sí paga
  const cambiarMontoExpensas = (valor: string) => {
    setMontoExpensas(valor);
    if (Number(valor) > 0) setExpensas('si');
  };
  const cambiarExpensas = (valor: '' | 'si' | 'no') => {
    setExpensas(valor);
    if (valor === 'no') setMontoExpensas('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requisitosCompletos) {
      mostrarError('Antes de enviar la solicitud tenés que marcar todos los requisitos para publicar tu propiedad.');
      return;
    }
    if (!titulo.trim()) return mostrarError('Escribí un título para la publicación.', 'titulo');
    if (!direccion.trim()) return mostrarError('Indicá la calle y el número del inmueble.', 'direccion');

    const numericos: [string, string, string][] = esTerreno
      ? [['superficieTotal', 'la superficie total', superficieTotal]]
      : [
          ['ambientes', 'los ambientes', ambientes],
          ['superficieTotal', 'la superficie total', superficieTotal],
          ['superficieCubierta', 'la superficie cubierta', superficieCubierta],
        ];
    const faltanteNumerico = numericos.find(([, , valor]) => !valor.trim() || Number(valor) <= 0);
    if (faltanteNumerico) return mostrarError(`Completá ${faltanteNumerico[1]} con un valor mayor a cero.`, faltanteNumerico[0]);

    if (!expensas) return mostrarError('Indicá si la propiedad paga expensas.', 'expensas');
    if (expensas === 'si' && montoExpensas.trim() && Number(montoExpensas) < 0) {
      return mostrarError('El monto de expensas no puede ser negativo.', 'montoExpensas');
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) return mostrarError('Ingresá un precio pretendido mayor a cero.', 'monto');

    if (!descripcion.trim() || descripcion.trim().length < 20) {
      return mostrarError('Agregá una descripción de al menos 20 caracteres.', 'descripcion');
    }
    if (fotosLocales.length === 0 && !fotosTexto.trim()) return mostrarError('Adjuntá al menos una foto de la propiedad.', 'fotos');

    const faltanteDocumento = DOCUMENTOS.find((doc) => doc.obligatorio && !documentos[doc.clave]);
    if (faltanteDocumento) return mostrarError(`Adjuntá: ${faltanteDocumento.nombre}.`, `doc-${faltanteDocumento.clave}`);

    limpiarError();
    setEnviando(true);

    try {
      let urlsSubidas: string[] = [];
      if (fotosLocales.length > 0) {
        setMensajeEnvio(`Subiendo ${fotosLocales.length} foto(s)…`);
        urlsSubidas = await subirFotosPublicacion(fotosLocales.map((f) => f.file));
      }

      const urlsExtra = fotosTexto
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && f.startsWith('http'));

      const adjuntos = DOCUMENTOS.filter((doc) => documentos[doc.clave]);
      setMensajeEnvio('Subiendo documentación…');
      const documentosSubidos = await subirDocumentosPublicacion(adjuntos.map((doc) => documentos[doc.clave] as File));

      setMensajeEnvio('Registrando solicitud…');
      const payload: CrearSolicitudPayload = {
        tipoPropiedad,
        operacion,
        titulo: titulo.trim(),
        direccion: direccion.trim(),
        ciudad,
        provincia: PROVINCIA,
        referenciasUbicacion: referenciasUbicacion.trim(),
        ambientes: esTerreno ? 0 : parseInt(ambientes, 10) || 1,
        dormitorios: tieneDormitorios ? parseInt(dormitorios, 10) || 0 : 0,
        banos: esTerreno ? 0 : parseInt(banos, 10) || 1,
        expensas,
        montoExpensas: expensas === 'si' ? parseFloat(montoExpensas) || 0 : 0,
        cochera: esTerreno ? 'no' : cochera,
        pisoUnidad: esDepartamento ? pisoUnidad.trim() : '',
        comodidades: esTerreno ? [] : comodidades,
        otrasComodidades: otrasComodidades.trim(),
        superficieTotal: parseFloat(superficieTotal) || 0,
        superficieCubierta: esTerreno ? 0 : parseFloat(superficieCubierta) || 0,
        precioPretendido: { monto: montoNum, moneda },
        descripcion: descripcion.trim(),
        fotos: [...urlsSubidas, ...urlsExtra],
        documentos: Object.fromEntries(adjuntos.map((doc, indice) => [doc.clave, documentosSubidos[indice]])) as CrearSolicitudPayload['documentos'],
        contacto: user
          ? {
              nombre: user.nombre || '',
              apellido: user.apellido || '',
              email: user.email,
              telefono: user.telefono || '',
              dni: user.dni || '',
            }
          : undefined,
      };

      await enviarSolicitudPublicacion(payload);
      setEnviadoExitoso(true);
      window.__lenis?.scrollTo(0, { immediate: true });
      if (!window.__lenis) window.scrollTo({ top: 0 });
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : 'No se pudo enviar el pedido. Probá de nuevo en un momento.');
    } finally {
      setEnviando(false);
      setMensajeEnvio('');
    }
  };

  const obligatoriosListos = DOCUMENTOS.filter((doc) => doc.obligatorio && documentos[doc.clave]).length;
  const totalObligatorios = DOCUMENTOS.filter((doc) => doc.obligatorio).length;

  return (
    <SitioBase>
      <header className="encabezado-color encabezado-azul px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
        <div className="mx-auto max-w-5xl">
          <p className="calma-micro m-0 mb-3 text-[#d9382b]">¿Querés vender o alquilar?</p>
          <h1 className="font-display m-0 text-[clamp(44px,7vw,110px)] font-normal leading-[0.92] tracking-[-0.02em]">
            Publicá tu propiedad
          </h1>
          <p className="m-0 mt-5 max-w-2xl text-[17px] leading-relaxed text-[#efe9df]/75">
            Completá este formulario con los datos, las fotos y la documentación de tu inmueble. Nuestro equipo lo revisa, coordina una visita o tasación si hace falta y lo publica en el catálogo.
          </p>
        </div>
      </header>

      <div className="px-5 pb-32 sm:px-10">
        <div className="mx-auto max-w-5xl">
          {!isLoading && !user ? (
            <div className="rounded-2xl border border-[#efe9df]/20 bg-[#efe9df]/5 p-8 text-center sm:p-14">
              <h2 className="font-display m-0 text-[28px] text-[#efe9df]">Iniciá sesión para solicitar la publicación</h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#efe9df]/70">
                Para poder hacer el seguimiento del estado de tu solicitud de publicación y gestionar tus inmuebles, necesitás tener una cuenta.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/login?volver=/publicar" className={botonPrincipal}>
                  Ingresar a mi cuenta
                </Link>
                <Link href="/register?volver=/publicar" className={botonLinea}>
                  Crear cuenta gratis
                </Link>
              </div>
            </div>
          ) : enviadoExitoso ? (
            <div role="status" className="rounded-2xl border border-[#9fd8b4]/30 bg-[#9fd8b4]/10 p-8 text-center sm:p-14">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#9fd8b4]/20 text-3xl text-[#9fd8b4]">
                ✓
              </div>
              <h2 className="font-display m-0 text-[32px] text-[#efe9df]">¡Solicitud enviada con éxito!</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#efe9df]/80">
                Recibimos el pedido de publicación de tu propiedad en <strong className="text-white">{direccion}</strong>. Araceli y nuestro equipo la van a revisar en breve.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/mis-publicaciones" className={botonPrincipal}>
                  Ver tus publicaciones
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    fotosLocales.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                    setEnviadoExitoso(false);
                    setTitulo('');
                    setDireccion('');
                    setMonto('');
                    setDescripcion('');
                    setExpensas('');
                    setMontoExpensas('');
                    setFotosLocales([]);
                    setFotosTexto('');
                    setDocumentos({});
                  }}
                  className={botonLinea}
                >
                  Enviar otra propiedad
                </button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-14">
              {/* Avisos arriba de todo: si algo falta, la pantalla sube hasta acá */}
              <div ref={avisoRef} tabIndex={-1} className="flex scroll-mt-32 flex-col gap-4 outline-none">
                {!requisitosCompletos && estadoRequisitos !== 'cargando' && (
                  <div className="rounded-2xl border border-[#d9382b]/50 bg-[#d9382b]/10 p-5 text-[15px] leading-relaxed text-[#efe9df]">
                    <p className="m-0 font-medium">Completá todos los requisitos antes de solicitar la publicación.</p>
                    <p className="m-0 mt-2 text-[#efe9df]/70">
                      Te faltan {requisitosPublicar.filter((requisito) => !requisitosMarcados[requisito.id]).length} requisitos.{' '}
                      <Link href="/requisitos?para=publicar" className="underline underline-offset-4 hover:text-white">
                        Ver la lista para publicar
                      </Link>
                    </p>
                  </div>
                )}
                {estadoRequisitos === 'cargando' && <p className="m-0 text-[14px] text-[#efe9df]/60">Verificando tus requisitos…</p>}
                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[#d9382b]/50 bg-[#d9382b]/15 p-5 text-[15px] leading-relaxed text-[#efe9df]">
                    <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d9382b] text-[13px] font-semibold text-white">!</span>
                    <div>
                      <p className="m-0 font-medium">La solicitud todavía no se envió.</p>
                      <p className="m-0 mt-1 text-[#efe9df]/80">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Tipo y operación */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>1. Tipo de inmueble y operación</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor={`${id}-titulo`} className={etiqueta}>Título de la publicación *</label>
                    <input id={`${id}-titulo`} type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Casa con patio y cochera" className={control} aria-invalid={invalido('titulo')} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-operacion`} className={etiqueta}>Operación *</label>
                    <select id={`${id}-operacion`} value={operacion} onChange={(e) => setOperacion(e.target.value)} className={selector}>
                      {OPERACIONES.map(([valor, nombre]) => (
                        <option key={valor} value={valor}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-tipoPropiedad`} className={etiqueta}>Tipo de propiedad *</label>
                    <select id={`${id}-tipoPropiedad`} value={tipoPropiedad} onChange={(e) => setTipoPropiedad(e.target.value as TipoPropiedad)} className={selector}>
                      {TIPOS.map(([valor, nombre]) => (
                        <option key={valor} value={valor}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* 2. Ubicación */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>2. Ubicación</h2>
                <p className="m-0 mt-2 text-[14px] text-[#efe9df]/60">Trabajamos en Villa Libertador San Martín, Crespo y Diamante.</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-direccion`} className={etiqueta}>Calle y número *</label>
                    <input id={`${id}-direccion`} type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: 25 de Mayo 740" className={control} aria-invalid={invalido('direccion')} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-ciudad`} className={etiqueta}>Localidad *</label>
                    <select id={`${id}-ciudad`} value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={selector}>
                      {LOCALIDADES.map((localidad) => (
                        <option key={localidad} value={localidad}>{localidad}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={etiqueta}>Provincia</span>
                    <p className="m-0 border-b border-[#efe9df]/15 py-3 text-[18px] text-[#efe9df]/70">{PROVINCIA}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-referencias`} className={etiqueta}>Referencias</label>
                    <input id={`${id}-referencias`} type="text" value={referenciasUbicacion} onChange={(e) => setReferenciasUbicacion(e.target.value)} placeholder="Entre qué calles, cerca de qué" className={control} />
                  </div>
                </div>
              </section>

              {/* 3. Ambientes y medidas (cambia según el tipo) */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>{esTerreno ? '3. Medidas' : '3. Ambientes y medidas'}</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {!esTerreno && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-ambientes`} className={etiqueta}>Ambientes *</label>
                      <input id={`${id}-ambientes`} type="number" min="1" value={ambientes} onChange={(e) => setAmbientes(e.target.value)} className={control} aria-invalid={invalido('ambientes')} />
                    </div>
                  )}
                  {tieneDormitorios && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-dormitorios`} className={etiqueta}>Dormitorios</label>
                      <input id={`${id}-dormitorios`} type="number" min="0" value={dormitorios} onChange={(e) => setDormitorios(e.target.value)} className={control} />
                    </div>
                  )}
                  {!esTerreno && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-banos`} className={etiqueta}>Baños</label>
                      <input id={`${id}-banos`} type="number" min="0" value={banos} onChange={(e) => setBanos(e.target.value)} className={control} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-superficieTotal`} className={etiqueta}>Superficie total (m²) *</label>
                    <input id={`${id}-superficieTotal`} type="number" min="0" value={superficieTotal} onChange={(e) => setSuperficieTotal(e.target.value)} placeholder={esTerreno ? 'Ej: 300' : 'Ej: 120'} className={control} aria-invalid={invalido('superficieTotal')} />
                  </div>
                  {!esTerreno && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-superficieCubierta`} className={etiqueta}>Superficie cubierta (m²) *</label>
                      <input id={`${id}-superficieCubierta`} type="number" min="0" value={superficieCubierta} onChange={(e) => setSuperficieCubierta(e.target.value)} placeholder="Ej: 95" className={control} aria-invalid={invalido('superficieCubierta')} />
                    </div>
                  )}
                  {!esTerreno && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-cochera`} className={etiqueta}>Cochera</label>
                      <select id={`${id}-cochera`} value={cochera} onChange={(e) => setCochera(e.target.value)} className={selector}>
                        <option value="no">No</option>
                        <option value="si">Sí</option>
                      </select>
                    </div>
                  )}
                  {esDepartamento && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`${id}-piso`} className={etiqueta}>Piso / unidad</label>
                      <input id={`${id}-piso`} type="text" value={pisoUnidad} onChange={(e) => setPisoUnidad(e.target.value)} placeholder="Ej: 2° B" className={control} />
                    </div>
                  )}
                </div>
              </section>

              {/* 4. Expensas y comodidades */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>{esTerreno ? '4. Expensas y otros detalles' : '4. Expensas y comodidades'}</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" aria-invalid={invalido('expensas')}>
                    <legend className={`${etiqueta} mb-3 p-0`}>¿Paga expensas? *</legend>
                    <div className="flex flex-wrap gap-3">
                      {([['no', 'No paga'], ['si', 'Sí paga']] as const).map(([valor, nombre]) => (
                        <label
                          key={valor}
                          className={`cursor-pointer rounded-full border px-5 py-2.5 text-[15px] transition-colors duration-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#efe9df] ${
                            expensas === valor
                              ? 'border-[#efe9df] bg-[#efe9df] text-[#071733]'
                              : invalido('expensas')
                                ? 'border-[#d9382b] text-[#efe9df]'
                                : 'border-[#efe9df]/35 text-[#efe9df]/80 hover:border-[#efe9df]'
                          }`}
                        >
                          <input type="radio" name={`${id}-expensas`} value={valor} checked={expensas === valor} onChange={() => cambiarExpensas(valor)} className="sr-only" />
                          {nombre}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-montoExpensas`} className={etiqueta}>Monto mensual de expensas</label>
                    <input
                      id={`${id}-montoExpensas`}
                      type="number"
                      min="0"
                      value={montoExpensas}
                      onChange={(e) => cambiarMontoExpensas(e.target.value)}
                      disabled={expensas === 'no'}
                      placeholder={expensas === 'no' ? 'No corresponde' : 'Ej: 25000'}
                      className={`${control} disabled:opacity-40`}
                      aria-invalid={invalido('montoExpensas')}
                    />
                    <p className="m-0 text-[13px] text-[#efe9df]/50">Si cargás un monto, queda marcado que sí paga.</p>
                  </div>
                  {!esTerreno && (
                    <div className="sm:col-span-2">
                      <p className={etiqueta}>Comodidades</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {COMODIDADES.map(([valor, nombre]) => (
                          <label key={valor} className="flex items-center gap-2 text-[15px] text-[#efe9df]/80">
                            <input type="checkbox" checked={comodidades.includes(valor)} onChange={(e) => setComodidades((actuales) => e.target.checked ? [...actuales, valor] : actuales.filter((actual) => actual !== valor))} />
                            {nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor={`${id}-otrasComodidades`} className={etiqueta}>{esTerreno ? 'Otros detalles' : 'Otras comodidades'}</label>
                    <input id={`${id}-otrasComodidades`} type="text" value={otrasComodidades} onChange={(e) => setOtrasComodidades(e.target.value)} placeholder={esTerreno ? 'Servicios disponibles, frente, fondo…' : 'Detalles adicionales de la propiedad'} className={control} />
                  </div>
                </div>
              </section>

              {/* 5. Precio */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>5. Precio pretendido</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-moneda`} className={etiqueta}>Moneda *</label>
                    <select id={`${id}-moneda`} value={moneda} onChange={(e) => setMoneda(e.target.value as 'USD' | 'ARS')} className={selector}>
                      <option value="USD">Dólares (USD)</option>
                      <option value="ARS">Pesos (ARS)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-monto`} className={etiqueta}>Monto pretendido *</label>
                    <input id={`${id}-monto`} type="number" min="1" step="any" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej: 85000" className={control} aria-invalid={invalido('monto')} required />
                  </div>
                </div>
              </section>

              {/* 6. Descripción y fotos */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className={tituloSeccion}>6. Descripción y fotos</h2>
                <div className="mt-6 flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-descripcion`} className={etiqueta}>Descripción *</label>
                    <textarea
                      id={`${id}-descripcion`}
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Contanos sobre el estado del inmueble, iluminación, servicios, patio o detalles que quieras destacar…"
                      className={`${control} resize-y`}
                      aria-invalid={invalido('descripcion')}
                    />
                    <p className="m-0 text-[13px] text-[#efe9df]/50">{descripcion.trim().length < 20 ? `Mínimo 20 caracteres (vas ${descripcion.trim().length}).` : 'Listo.'}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className={`${etiqueta} m-0`}>Fotos de la propiedad * <span className="normal-case text-[#efe9df]/45">· {fotosLocales.length}/{MAX_FOTOS}</span></p>
                    <input ref={fileInputRef} id={`${id}-fotos-archivos`} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleInputChange} className="sr-only" tabIndex={-1} />
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Elegir fotos de la propiedad"
                      className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                        arrastrando
                          ? 'scale-[1.01] border-white bg-white/15'
                          : invalido('fotos')
                            ? 'border-[#d9382b] bg-[#d9382b]/10'
                            : 'border-[#efe9df]/30 bg-[#efe9df]/5 hover:border-[#efe9df]/60 hover:bg-[#efe9df]/10'
                      }`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#efe9df]/10 text-2xl text-[#efe9df] transition-transform group-hover:scale-110" aria-hidden="true">
                        📷
                      </div>
                      <p className="m-0 text-[16px] font-medium text-[#efe9df]">
                        Arrastrá tus fotos acá o <span className="underline decoration-[#d9382b] decoration-2">elegilas de tu dispositivo</span>
                      </p>
                      <p className="m-0 text-[13px] text-[#efe9df]/55">JPG, PNG, WEBP o GIF · hasta 10 MB cada una · máximo {MAX_FOTOS} fotos.</p>
                    </div>

                    {fotosLocales.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-[#efe9df]/70">
                          <span>{fotosLocales.length} foto(s) lista(s) para subir</span>
                          <button
                            type="button"
                            onClick={() => {
                              fotosLocales.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                              setFotosLocales([]);
                            }}
                            className="text-[#ff8a7d] hover:underline"
                          >
                            Quitar todas
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                          {fotosLocales.map((foto, indice) => (
                            <div key={foto.id} className="group relative aspect-video overflow-hidden rounded-xl border border-[#efe9df]/20 bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                              <img src={foto.previewUrl} alt={`Foto ${indice + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                              {indice === 0 && (
                                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] text-white">Portada</span>
                              )}
                              <button
                                type="button"
                                onClick={() => eliminarFoto(foto.id)}
                                aria-label={`Quitar ${foto.file.name}`}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-xs text-white opacity-90 transition-opacity hover:bg-[#d9382b] hover:opacity-100"
                              >
                                ✕
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white">
                                {foto.file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-1">
                      <button type="button" onClick={() => setMostrarUrlsExtra(!mostrarUrlsExtra)} className="text-[13px] text-[#efe9df]/60 underline transition-colors hover:text-[#efe9df]">
                        {mostrarUrlsExtra ? 'Ocultar enlaces web' : '+ ¿Tenés las fotos subidas en internet? Pegá los enlaces'}
                      </button>
                      {mostrarUrlsExtra && (
                        <div className="mt-3 flex flex-col gap-2">
                          <label htmlFor={`${id}-fotos`} className={etiqueta}>Enlaces de fotos (uno por línea)</label>
                          <textarea
                            id={`${id}-fotos`}
                            rows={3}
                            value={fotosTexto}
                            onChange={(e) => setFotosTexto(e.target.value)}
                            placeholder={'https://ejemplo.com/foto1.jpg\nhttps://ejemplo.com/foto2.jpg'}
                            className={`${control} resize-y font-mono text-sm`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 7. Documentación: un archivo por documento */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className={tituloSeccion}>7. Documentación</h2>
                  <span className="text-[14px] tabular-nums text-[#efe9df]/60">
                    {obligatoriosListos} de {totalObligatorios} obligatorios
                  </span>
                </div>
                <p className="m-0 mt-2 max-w-2xl text-[14px] leading-relaxed text-[#efe9df]/60">
                  Subí cada documento por separado: un PDF o una foto (JPG, PNG o WEBP) de hasta 4 MB. Se guardan cifrados y solo los ve la inmobiliaria.
                </p>
                <ul className="m-0 mt-6 flex list-none flex-col gap-3 p-0">
                  {DOCUMENTOS.map((doc) => {
                    const archivo = documentos[doc.clave];
                    const inputId = `${id}-doc-${doc.clave}`;
                    const conError = invalido(`doc-${doc.clave}`);
                    return (
                      <li
                        key={doc.clave}
                        className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                          conError ? 'border-[#d9382b] bg-[#d9382b]/10' : archivo ? 'border-[#9fd8b4]/40 bg-[#9fd8b4]/5' : 'border-[#efe9df]/20 bg-[#efe9df]/5'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] ${
                              archivo ? 'bg-[#9fd8b4]/25 text-[#9fd8b4]' : 'border border-[#efe9df]/30 text-[#efe9df]/50'
                            }`}
                          >
                            {archivo ? '✓' : ''}
                          </span>
                          <div className="min-w-0">
                            <p className="m-0 text-[16px] text-[#efe9df]">
                              {doc.nombre}{' '}
                              <span className={`text-[12px] ${doc.obligatorio ? 'text-[#ff8a7d]' : 'text-[#efe9df]/50'}`}>
                                {doc.obligatorio ? 'Obligatorio' : 'Opcional'}
                              </span>
                            </p>
                            <p className="m-0 mt-0.5 truncate text-[13px] text-[#efe9df]/55">
                              {archivo ? `${archivo.name} · ${pesoLegible(archivo.size)}` : doc.ayuda}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                          <input
                            id={inputId}
                            type="file"
                            accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              elegirDocumento(doc.clave, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                            className="peer sr-only"
                          />
                          <label
                            htmlFor={inputId}
                            className="calma-micro inline-flex cursor-pointer items-center rounded-full border border-[#efe9df]/40 px-4 py-2.5 text-[11px] text-[#efe9df] transition-colors duration-300 hover:border-[#efe9df] hover:bg-[#efe9df]/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#efe9df]"
                          >
                            {archivo ? 'Cambiar' : 'Elegir archivo'}
                          </label>
                          {archivo && (
                            <button type="button" onClick={() => quitarDocumento(doc.clave)} className="px-2 text-[13px] text-[#ff8a7d] hover:underline">
                              Quitar
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="flex flex-col gap-4 border-t border-[#efe9df]/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={enviando || !requisitosCompletos || estadoRequisitos === 'cargando'} className={botonPrincipal}>
                  {enviando ? mensajeEnvio || 'Enviando solicitud…' : 'Enviar solicitud de publicación'}
                </button>
                <p aria-live="polite" className="m-0 text-[13px] text-[#efe9df]/55">
                  {enviando ? 'No cierres esta página hasta que termine.' : 'Al enviar, nos ponemos en contacto con vos para coordinar los próximos pasos.'}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </SitioBase>
  );
}
