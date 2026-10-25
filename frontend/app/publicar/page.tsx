'use client';

import { useState, useId, useRef, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import SitioBase from '@/components/sitio/SitioBase';
import { useAuth } from '@/context/AuthContext';
import {
  enviarSolicitudPublicacion,
  subirFotosPublicacion,
  type CrearSolicitudPayload,
} from '@/services/solicitudesPublicacion';

const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
const selector =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-[#071733] py-3 text-[18px] text-[#efe9df] transition-colors duration-500 focus:border-[#efe9df] focus:outline-none';
const botonPrincipal =
  'calma-micro inline-flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-8 py-4 text-[13px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';
const botonLinea =
  'calma-micro inline-flex items-center justify-center rounded-full border border-[#efe9df]/40 px-6 py-3.5 text-[12px] text-[#efe9df] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/10';

interface FotoLocal {
  id: string;
  file: File;
  previewUrl: string;
}

export default function PublicarPropiedadPage() {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isLoading } = useAuth();

  const [tipoPropiedad, setTipoPropiedad] = useState('casa');
  const [operacion, setOperacion] = useState('venta');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('Libertador San Martín');
  const [ambientes, setAmbientes] = useState('2');
  const [dormitorios, setDormitorios] = useState('1');
  const [banos, setBanos] = useState('1');
  const [superficieTotal, setSuperficieTotal] = useState('');
  const [superficieCubierta, setSuperficieCubierta] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');
  const [descripcion, setDescripcion] = useState('');

  // Subida de fotos
  const [fotosLocales, setFotosLocales] = useState<FotoLocal[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [fotosTexto, setFotosTexto] = useState('');
  const [mostrarUrlsExtra, setMostrarUrlsExtra] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);

  const agregarArchivos = (nuevos: FileList | File[]) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    const validos = Array.from(nuevos).filter((f) => permitidos.includes(f.type));

    if (validos.length === 0) {
      setError('Solo se aceptan fotos en formato JPG, PNG, WEBP o GIF.');
      return;
    }

    if (fotosLocales.length + validos.length > 15) {
      setError('Podés subir hasta 15 fotos como máximo.');
      return;
    }

    setError(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      agregarArchivos(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      agregarArchivos(e.target.files);
    }
  };

  const eliminarFoto = (idFoto: string) => {
    setFotosLocales((prev) => {
      const encontrada = prev.find((f) => f.id === idFoto);
      if (encontrada) URL.revokeObjectURL(encontrada.previewUrl);
      return prev.filter((f) => f.id !== idFoto);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!direccion.trim()) {
      setError('Por favor indicá la dirección del inmueble.');
      document.getElementById(`${id}-direccion`)?.focus();
      return;
    }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Por favor ingresá un precio pretendido válido mayor a cero.');
      document.getElementById(`${id}-monto`)?.focus();
      return;
    }

    setError(null);
    setEnviando(true);

    try {
      let urlsSubidas: string[] = [];

      // Si hay archivos seleccionados, subirlos primero
      if (fotosLocales.length > 0) {
        setMensajeEnvio(`Subiendo ${fotosLocales.length} foto(s)…`);
        const archivos = fotosLocales.map((f) => f.file);
        urlsSubidas = await subirFotosPublicacion(archivos);
      }

      // Si cargó URLs adicionales por texto
      const urlsExtra = fotosTexto
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && f.startsWith('http'));

      const todasLasFotos = [...urlsSubidas, ...urlsExtra];

      setMensajeEnvio('Registrando solicitud…');
      const payload: CrearSolicitudPayload = {
        tipoPropiedad,
        operacion,
        direccion: direccion.trim(),
        ciudad: ciudad.trim() || 'Libertador San Martín',
        ambientes: parseInt(ambientes, 10) || 1,
        dormitorios: parseInt(dormitorios, 10) || 0,
        banos: parseInt(banos, 10) || 1,
        superficieTotal: parseFloat(superficieTotal) || 0,
        superficieCubierta: parseFloat(superficieCubierta) || 0,
        precioPretendido: {
          monto: montoNum,
          moneda,
        },
        descripcion: descripcion.trim(),
        fotos: todasLasFotos,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.');
    } finally {
      setEnviando(false);
      setMensajeEnvio('');
    }
  };

  return (
    <SitioBase>
      <header className="encabezado-color encabezado-azul px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
        <div className="mx-auto max-w-5xl">
          <p className="calma-micro m-0 mb-3 text-[#d9382b]">¿Querés vender o alquilar?</p>
          <h1 className="font-display m-0 text-[clamp(44px,7vw,110px)] font-normal leading-[0.92] tracking-[-0.02em]">
            Publicá tu propiedad
          </h1>
          <p className="m-0 mt-5 max-w-2xl text-[17px] leading-relaxed text-[#efe9df]/75">
            Completá este formulario con los datos y fotos de tu inmueble. Nuestro equipo revisará la información, coordinará una visita o tasación si corresponde y la publicará en nuestro catálogo.
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
            <div className="rounded-2xl border border-[#9fd8b4]/30 bg-[#9fd8b4]/10 p-8 text-center sm:p-14">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#9fd8b4]/20 text-3xl text-[#9fd8b4]">
                ✓
              </div>
              <h2 className="font-display m-0 text-[32px] text-[#efe9df]">¡Solicitud enviada con éxito!</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#efe9df]/80">
                Recibimos el pedido de publicación con las fotos de tu propiedad en <strong className="text-white">{direccion}</strong>. Araceli y nuestro equipo la revisarán en breve.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/perfil" className={botonPrincipal}>
                  Ver mis publicaciones en Mi Cuenta
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEnviadoExitoso(false);
                    setDireccion('');
                    setMonto('');
                    setDescripcion('');
                    setFotosLocales([]);
                    setFotosTexto('');
                  }}
                  className={botonLinea}
                >
                  Enviar otra propiedad
                </button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-14">
              {/* Sección 1: Tipo y Operación */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">1. Tipo de inmueble y operación</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-operacion`} className={etiqueta}>
                      Operación deseada *
                    </label>
                    <select
                      id={`${id}-operacion`}
                      value={operacion}
                      onChange={(e) => setOperacion(e.target.value)}
                      className={selector}
                    >
                      <option value="venta">Venta</option>
                      <option value="alquiler">Alquiler permanente</option>
                      <option value="temporario">Alquiler temporario / por día</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-tipoPropiedad`} className={etiqueta}>
                      Tipo de propiedad *
                    </label>
                    <select
                      id={`${id}-tipoPropiedad`}
                      value={tipoPropiedad}
                      onChange={(e) => setTipoPropiedad(e.target.value)}
                      className={selector}
                    >
                      <option value="casa">Casa</option>
                      <option value="departamento">Departamento</option>
                      <option value="monoambiente">Monoambiente</option>
                      <option value="terreno">Terreno / Lote</option>
                      <option value="local">Local comercial</option>
                      <option value="oficina">Oficina</option>
                      <option value="cochera">Cochera</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Sección 2: Ubicación */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">2. Ubicación</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-direccion`} className={etiqueta}>
                      Calle y número *
                    </label>
                    <input
                      id={`${id}-direccion`}
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: 25 de Mayo 740"
                      className={control}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-ciudad`} className={etiqueta}>
                      Ciudad / Localidad
                    </label>
                    <input
                      id={`${id}-ciudad`}
                      type="text"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Libertador San Martín"
                      className={control}
                    />
                  </div>
                </div>
              </section>

              {/* Sección 3: Dimensiones y Ambientes */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">3. Ambientes y dimensiones</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-ambientes`} className={etiqueta}>
                      Ambientes
                    </label>
                    <input
                      id={`${id}-ambientes`}
                      type="number"
                      min="1"
                      value={ambientes}
                      onChange={(e) => setAmbientes(e.target.value)}
                      className={control}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-dormitorios`} className={etiqueta}>
                      Dormitorios
                    </label>
                    <input
                      id={`${id}-dormitorios`}
                      type="number"
                      min="0"
                      value={dormitorios}
                      onChange={(e) => setDormitorios(e.target.value)}
                      className={control}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-banos`} className={etiqueta}>
                      Baños
                    </label>
                    <input
                      id={`${id}-banos`}
                      type="number"
                      min="0"
                      value={banos}
                      onChange={(e) => setBanos(e.target.value)}
                      className={control}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-superficieTotal`} className={etiqueta}>
                      Superficie total (m²)
                    </label>
                    <input
                      id={`${id}-superficieTotal`}
                      type="number"
                      min="0"
                      value={superficieTotal}
                      onChange={(e) => setSuperficieTotal(e.target.value)}
                      placeholder="Ej: 120"
                      className={control}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-superficieCubierta`} className={etiqueta}>
                      Superficie cubierta (m²)
                    </label>
                    <input
                      id={`${id}-superficieCubierta`}
                      type="number"
                      min="0"
                      value={superficieCubierta}
                      onChange={(e) => setSuperficieCubierta(e.target.value)}
                      placeholder="Ej: 95"
                      className={control}
                    />
                  </div>
                </div>
              </section>

              {/* Sección 4: Precio Pretendido */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">4. Precio pretendido</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-moneda`} className={etiqueta}>
                      Moneda *
                    </label>
                    <select
                      id={`${id}-moneda`}
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as 'USD' | 'ARS')}
                      className={selector}
                    >
                      <option value="USD">Dólares Estadounidenses (USD)</option>
                      <option value="ARS">Pesos Argentinos (ARS)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-monto`} className={etiqueta}>
                      Monto pretendido *
                    </label>
                    <input
                      id={`${id}-monto`}
                      type="number"
                      min="1"
                      step="any"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="Ej: 85000"
                      className={control}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Sección 5: Descripción y Fotos (Caja interactiva de subida) */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">5. Descripción y fotografías</h2>
                <div className="mt-6 flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-descripcion`} className={etiqueta}>
                      Descripción o detalles adicionales
                    </label>
                    <textarea
                      id={`${id}-descripcion`}
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Contanos sobre el estado del inmueble, iluminación, servicios, patio o detalles que quieras destacar…"
                      className={`${control} resize-y`}
                    />
                  </div>

                  {/* Caja de subida de fotos */}
                  <div className="flex flex-col gap-3">
                    <label className={etiqueta}>Fotografías del inmueble</label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleInputChange}
                      className="hidden"
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                        arrastrando
                          ? 'border-white bg-white/15 scale-[1.01]'
                          : 'border-[#efe9df]/30 bg-[#efe9df]/5 hover:border-[#efe9df]/60 hover:bg-[#efe9df]/10'
                      }`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#efe9df]/10 text-2xl text-[#efe9df] transition-transform group-hover:scale-110">
                        📷
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="m-0 text-[16px] font-medium text-[#efe9df]">
                          Arrastrá tus fotos acá o <span className="underline decoration-[#d9382b] decoration-2">hacé clic para elegirlas</span>
                        </p>
                        <p className="m-0 text-[13px] text-[#efe9df]/55">
                          Formatos JPG, PNG, WEBP o GIF (hasta 10 MB cada una, máximo 15 fotos).
                        </p>
                      </div>
                    </div>

                    {/* Previsualización de fotos seleccionadas */}
                    {fotosLocales.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-[#efe9df]/70">
                          <span>{fotosLocales.length} foto(s) lista(s) para subir:</span>
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
                          {fotosLocales.map((foto) => (
                            <div
                              key={foto.id}
                              className="group relative aspect-video overflow-hidden rounded-xl border border-[#efe9df]/20 bg-black/40"
                            >
                              <img
                                src={foto.previewUrl}
                                alt="Previsualización"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  eliminarFoto(foto.id);
                                }}
                                title="Eliminar foto"
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

                    {/* Alternativa: Enlaces web adicionales */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setMostrarUrlsExtra(!mostrarUrlsExtra)}
                        className="text-[13px] text-[#efe9df]/60 hover:text-[#efe9df] transition-colors underline"
                      >
                        {mostrarUrlsExtra ? 'Ocultar enlaces web' : '+ ¿Querés agregar enlaces web de fotos existentes?'}
                      </button>

                      {mostrarUrlsExtra && (
                        <div className="mt-3 flex flex-col gap-2">
                          <label htmlFor={`${id}-fotos`} className={etiqueta}>
                            Enlaces de fotos (uno por línea)
                          </label>
                          <textarea
                            id={`${id}-fotos`}
                            rows={3}
                            value={fotosTexto}
                            onChange={(e) => setFotosTexto(e.target.value)}
                            placeholder="https://ejemplo.com/foto1.jpg&#10;https://ejemplo.com/foto2.jpg"
                            className={`${control} font-mono text-sm resize-y`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {error && (
                <div role="alert" className="rounded-lg bg-[#d9382b]/15 border border-[#d9382b]/40 p-4 text-[15px] text-[#ff8a7d]">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={enviando} className={botonPrincipal}>
                  {enviando ? mensajeEnvio || 'Enviando solicitud…' : 'Enviar solicitud de publicación'}
                </button>
                <p className="m-0 text-[13px] text-[#efe9df]/55">
                  Al enviar, nos pondremos en contacto con vos para coordinar los próximos pasos.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </SitioBase>
  );
}
