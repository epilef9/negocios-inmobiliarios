'use client';

import { useState, useId, type FormEvent } from 'react';
import Link from 'next/link';
import SitioBase from '@/components/sitio/SitioBase';
import { useAuth } from '@/context/AuthContext';
import { enviarSolicitudPublicacion, type CrearSolicitudPayload } from '@/services/solicitudesPublicacion';

const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
const selector =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-[#071733] py-3 text-[18px] text-[#efe9df] transition-colors duration-500 focus:border-[#efe9df] focus:outline-none';
const botonPrincipal =
  'calma-micro inline-flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-8 py-4 text-[13px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';
const botonLinea =
  'calma-micro inline-flex items-center justify-center rounded-full border border-[#efe9df]/40 px-6 py-3.5 text-[12px] text-[#efe9df] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/10';

export default function PublicarPropiedadPage() {
  const id = useId();
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
  const [fotosTexto, setFotosTexto] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);

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

    const fotos = fotosTexto
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && f.startsWith('http'));

    setError(null);
    setEnviando(true);

    try {
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
        fotos,
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
            Completá este formulario con los datos de tu inmueble. Nuestro equipo revisará la información, coordinará una visita o tasación si corresponde y la publicará en nuestro catálogo.
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
                Recibimos el pedido de publicación de tu propiedad en <strong className="text-white">{direccion}</strong>. Araceli y nuestro equipo la revisarán en breve.
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

              {/* Sección 5: Descripción y Fotos */}
              <section className="border-t border-[#efe9df]/15 pt-8">
                <h2 className="font-display m-0 text-[24px] text-[#efe9df]">5. Descripción y fotografías</h2>
                <div className="mt-6 flex flex-col gap-6">
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

                  <div className="flex flex-col gap-2">
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
                    <p className="m-0 text-[13px] text-[#efe9df]/50">
                      Podés pegar enlaces de fotos que tengas en Google Drive, Dropbox, Cloudinary o cualquier sitio web público.
                    </p>
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
                  {enviando ? 'Enviando solicitud…' : 'Enviar solicitud de publicación'}
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
