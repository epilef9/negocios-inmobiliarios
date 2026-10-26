'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createContrato,
  generarNumeroContrato,
  getContratoById,
  getDatosDeSolicitud,
  getSolicitudesParaContrato,
  updateContrato,
  type ContratoInput,
  type EstadoContrato,
  type SolicitudParaContrato,
} from '@/services/contratos';
import { getProperties, type ApiProperty } from '@/services/api';
import { getPanelClientes, type PropiedadParaAsignar, type UsuarioRegistrado } from '@/services/clientes';
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
const FECHA_CORTA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fechaCorta = (iso?: string) => {
  if (!iso) return '';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_CORTA.format(fecha);
};
const ahoraTexto = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} hs`;
};
const unir = (...partes: (string | null | undefined)[]) =>
  partes.map((parte) => (parte ?? '').trim()).filter(Boolean).join(' ');
const soloDigitos = (valor: string) => valor.replace(/\D/g, '');
const dniValido = (valor: string) => /^\d{7,8}$/.test(soloDigitos(valor));
const cuilValido = (valor: string) => /^\d{11}$/.test(soloDigitos(valor));

type Datos = {
  tipoContrato: TipoContrato;
  plantilla: string;
  propiedadId: string;
  propiedadTitulo: string;
  propiedadDireccion: string;
  propiedadCiudad: string;
  clienteNombre: string;
  clienteApellido: string;
  clienteDni: string;
  clienteCuil: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDomicilio: string;
  clienteLocalidad: string;
  clienteProvincia: string;
  clienteUsuarioId: string;
  cotitularNombre: string;
  cotitularApellido: string;
  cotitularDni: string;
  cotitularCuil: string;
  cotitularTelefono: string;
  cotitularEmail: string;
  cotitularDomicilio: string;
  cotitularLocalidad: string;
  cotitularProvincia: string;
  tipoGarantia: 'propietaria' | 'caucion';
  garanteNombre: string;
  garanteApellido: string;
  garanteDni: string;
  garanteCuil: string;
  garanteTelefono: string;
  garanteEmail: string;
  garanteDomicilio: string;
  garanteLocalidad: string;
  garanteProvincia: string;
  propietarioNombre: string;
  propietarioApellido: string;
  propietarioDni: string;
  propietarioDomicilio: string;
  propietarioTelefono: string;
  propietarioEmail: string;
  propietarioUsuarioId: string;
  solicitudId: string;
  publicacionId: string;
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
  clienteApellido: '',
  clienteDni: '',
  clienteCuil: '',
  clienteTelefono: '',
  clienteEmail: '',
  clienteDomicilio: '',
  clienteLocalidad: '',
  clienteProvincia: '',
  clienteUsuarioId: '',
  cotitularNombre: '',
  cotitularApellido: '',
  cotitularDni: '',
  cotitularCuil: '',
  cotitularTelefono: '',
  cotitularEmail: '',
  cotitularDomicilio: '',
  cotitularLocalidad: '',
  cotitularProvincia: '',
  tipoGarantia: 'propietaria',
  garanteNombre: '',
  garanteApellido: '',
  garanteDni: '',
  garanteCuil: '',
  garanteTelefono: '',
  garanteEmail: '',
  garanteDomicilio: '',
  garanteLocalidad: '',
  garanteProvincia: '',
  propietarioNombre: 'Araceli Balbuena',
  propietarioApellido: '',
  propietarioDni: '',
  propietarioDomicilio: '',
  propietarioTelefono: '',
  propietarioEmail: '',
  propietarioUsuarioId: '',
  solicitudId: '',
  publicacionId: '',
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
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([]);
  const [propiedadesPanel, setPropiedadesPanel] = useState<PropiedadParaAsignar[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudParaContrato[]>([]);
  const [solicitudElegida, setSolicitudElegida] = useState('');
  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
  const [resumenCarga, setResumenCarga] = useState<{ estado: string; completados: string[]; pendientes: string[]; datosIlegibles?: boolean } | null>(null);
  const [cargando, setCargando] = useState(Boolean(parametro));
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [faltan, setFaltan] = useState<string[]>([]);
  const [formatos, setFormatos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<'borrador' | 'activo' | null>(null);
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    getProperties()
      .then((lista) => setPropiedades(lista ?? []))
      .catch(() => setPropiedades([]));
    getPanelClientes()
      .then((panel) => {
        setUsuarios(panel.usuarios ?? []);
        setPropiedadesPanel(panel.propiedades ?? []);
      })
      .catch(() => setUsuarios([]));
    getSolicitudesParaContrato()
      .then((lista) => setSolicitudes(lista ?? []))
      .catch(() => setSolicitudes([]));
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
          propiedadId: c.propiedad?.id ?? '',
          propiedadTitulo: c.propiedad?.titulo ?? '',
          propiedadDireccion: c.propiedad?.direccion ?? '',
          propiedadCiudad: '',
          clienteNombre: c.cliente?.nombre ?? '',
          clienteApellido: c.cliente?.apellido ?? '',
          clienteDni: c.cliente?.dni ?? '',
          clienteCuil: c.cliente?.cuil ?? '',
          clienteTelefono: c.cliente?.telefono ?? '',
          clienteEmail: c.cliente?.email ?? '',
          clienteDomicilio: c.cliente?.domicilio ?? '',
          clienteLocalidad: c.cliente?.localidad ?? '',
          clienteProvincia: c.cliente?.provincia ?? '',
          clienteUsuarioId: c.cliente?.usuario ?? '',
          cotitularNombre: c.cotitular?.nombre ?? '',
          cotitularApellido: c.cotitular?.apellido ?? '',
          cotitularDni: c.cotitular?.dni ?? '',
          cotitularCuil: c.cotitular?.cuil ?? '',
          cotitularTelefono: c.cotitular?.telefono ?? '',
          cotitularEmail: c.cotitular?.email ?? '',
          cotitularDomicilio: c.cotitular?.domicilio ?? '',
          cotitularLocalidad: c.cotitular?.localidad ?? '',
          cotitularProvincia: c.cotitular?.provincia ?? '',
          tipoGarantia: c.tipoGarantia === 'caucion' ? 'caucion' : 'propietaria',
          garanteNombre: c.garante?.nombre ?? '',
          garanteApellido: c.garante?.apellido ?? '',
          garanteDni: c.garante?.dni ?? '',
          garanteCuil: c.garante?.cuil ?? '',
          garanteTelefono: c.garante?.telefono ?? '',
          garanteEmail: c.garante?.email ?? '',
          garanteDomicilio: c.garante?.domicilio ?? '',
          garanteLocalidad: c.garante?.localidad ?? '',
          garanteProvincia: c.garante?.provincia ?? '',
          propietarioNombre: c.propietario?.nombre || c.locadora || VACIO.propietarioNombre,
          propietarioApellido: c.propietario?.apellido ?? '',
          propietarioDni: c.propietario?.dni || c.locadoraDni || '',
          propietarioDomicilio: c.propietario?.domicilio ?? '',
          propietarioTelefono: c.propietario?.telefono ?? '',
          propietarioEmail: c.propietario?.email ?? '',
          propietarioUsuarioId: c.locadoraUsuario ?? '',
          solicitudId: c.solicitud ?? '',
          publicacionId: c.publicacion ?? '',
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
    setFormatos((f) => {
      if (!(campo in f)) return f;
      const copia = { ...f };
      delete copia[campo as string];
      return copia;
    });
  };

  // Al elegir la propiedad se completan el tipo de contrato y el monto según cómo está publicada
  const elegirPropiedad = (idPropiedad: string) => {
    const p = propiedades.find((x) => x._id === idPropiedad);
    const vinculada = propiedadesPanel.find((item) => item.id === idPropiedad);
    const propietario = vinculada?.propietarioUsuarioId ? usuarios.find((item) => item.id === vinculada.propietarioUsuarioId) : null;
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
        propietarioUsuarioId: propietario?.id ?? vinculada?.propietarioUsuarioId ?? '',
        propietarioNombre: propietario?.nombre ?? vinculada?.propietarioNombre ?? d.propietarioNombre,
        propietarioApellido: propietario || vinculada?.propietarioNombre ? '' : d.propietarioApellido,
        propietarioDni: propietario?.dni ?? vinculada?.propietarioDni ?? '',
        propietarioTelefono: propietario?.telefono ?? d.propietarioTelefono,
        propietarioEmail: propietario?.email ?? d.propietarioEmail,
      };
    });
    setFaltan((f) => f.filter((x) => x !== 'propiedadId' && x !== 'montoMensual'));
  };

  const elegirUsuario = (idUsuario: string) => {
    const usuario = usuarios.find((item) => item.id === idUsuario);
    if (!usuario) {
      cambiar('clienteUsuarioId', '');
      return;
    }
    setDatos((d) => ({
      ...d,
      clienteUsuarioId: usuario.id,
      clienteNombre: usuario.nombre,
      clienteApellido: usuario.apellido,
      clienteDni: usuario.dni,
      clienteTelefono: usuario.telefono,
      clienteEmail: usuario.email,
    }));
    setFaltan((f) => f.filter((x) => !['clienteNombre', 'clienteDni', 'clienteTelefono'].includes(x)));
  };

  const elegirPropietario = (idUsuario: string) => {
    const usuario = usuarios.find((item) => item.id === idUsuario);
    setDatos((d) => ({
      ...d,
      propietarioUsuarioId: usuario?.id ?? '',
      ...(usuario
        ? {
            propietarioNombre: usuario.nombre,
            propietarioApellido: '',
            propietarioDni: usuario.dni,
            propietarioTelefono: usuario.telefono,
            propietarioEmail: usuario.email,
          }
        : {}),
    }));
  };

  // Precarga el contrato con los datos (ya descifrados) de la solicitud elegida
  const cargarDesdeSolicitud = async (solicitudId: string) => {
    setSolicitudElegida(solicitudId);
    setResumenCarga(null);
    if (!solicitudId) return;
    setCargandoSolicitud(true);
    try {
      const d = await getDatosDeSolicitud(solicitudId);
      const tipoContrato: TipoContrato = d.solicitud.operacion === 'compra'
        ? 'Compraventa'
        : d.propiedad?.tipoInmueble === 'local' ? 'Comercial' : 'Alquiler permanente';
      const titular = d.titular;
      const cotitular = d.cotitular;
      const garante = d.garantia?.garante ?? null;
      const propietario = d.propietario;
      const precio = d.propiedad?.precio != null ? `${d.propiedad.moneda ?? 'USD'} ${miles(d.propiedad.precio)}` : '';

      setDatos((prev) => ({
        ...prev,
        tipoContrato,
        plantilla: PLANTILLA_DE[tipoContrato],
        solicitudId: d.solicitud.id,
        publicacionId: d.publicacionId || '',
        propiedadId: d.propiedad?.id || '',
        propiedadTitulo: d.propiedad?.titulo || '',
        propiedadDireccion: d.propiedad?.direccion || '',
        propiedadCiudad: d.propiedad?.ciudad || '',
        montoMensual: precio,
        duracionMeses: tipoContrato === 'Compraventa' ? '' : prev.duracionMeses || '24',
        clienteUsuarioId: d.solicitud.usuarioId || '',
        clienteNombre: titular.nombre || '',
        clienteApellido: titular.apellido || '',
        clienteDni: titular.dni || '',
        clienteCuil: titular.cuil || '',
        clienteTelefono: titular.telefono || '',
        clienteEmail: titular.email || '',
        clienteDomicilio: titular.domicilio || '',
        clienteLocalidad: titular.localidad || '',
        clienteProvincia: titular.provincia || '',
        cotitularNombre: cotitular?.nombre || '',
        cotitularApellido: cotitular?.apellido || '',
        cotitularDni: cotitular?.dni || '',
        cotitularCuil: cotitular?.cuil || '',
        cotitularTelefono: cotitular?.telefono || '',
        cotitularEmail: cotitular?.email || '',
        cotitularDomicilio: cotitular?.domicilio || '',
        cotitularLocalidad: cotitular?.localidad || '',
        cotitularProvincia: cotitular?.provincia || '',
        tipoGarantia: d.garantia?.tipo === 'caucion' ? 'caucion' : 'propietaria',
        garanteNombre: garante?.nombre || '',
        garanteApellido: garante?.apellido || '',
        garanteDni: garante?.dni || '',
        garanteCuil: garante?.cuil || '',
        garanteTelefono: garante?.telefono || '',
        garanteEmail: garante?.email || '',
        garanteDomicilio: garante?.domicilio || '',
        garanteLocalidad: garante?.localidad || '',
        garanteProvincia: garante?.provincia || '',
        propietarioUsuarioId: propietario?.usuarioId || '',
        propietarioNombre: propietario?.nombre || '',
        propietarioApellido: propietario?.apellido || '',
        propietarioDni: propietario?.dni || '',
        propietarioDomicilio: propietario?.domicilio || '',
        propietarioTelefono: propietario?.telefono || '',
        propietarioEmail: propietario?.email || '',
        incluyeGarante: tipoContrato === 'Compraventa' ? false : Boolean(d.garantia) || prev.incluyeGarante,
      }));

      setFaltan([]);
      setFormatos({});

      const completados: string[] = ['Tipo de contrato'];
      const pendientes: string[] = [];
      const cargado = (etiqueta: string, valor?: string | null) => {
        if (valor && valor.trim()) completados.push(etiqueta);
        else pendientes.push(etiqueta);
      };
      cargado('Propiedad', d.propiedad?.titulo);
      cargado('Monto', precio);
      cargado('Nombre del cliente', titular.nombre);
      cargado('Apellido del cliente', titular.apellido);
      cargado('DNI del cliente', titular.dni);
      cargado('CUIL del cliente', titular.cuil);
      cargado('Teléfono del cliente', titular.telefono);
      cargado('Email del cliente', titular.email);
      cargado('Domicilio del cliente', titular.domicilio);
      cargado('Localidad del cliente', titular.localidad);
      cargado('Provincia del cliente', titular.provincia);
      if (cotitular) completados.push('Datos del cotitular');
      if (d.garantia?.tipo) completados.push(d.garantia.tipo === 'propietaria' ? 'Garantía propietaria' : 'Garantía de caución');
      if (garante) completados.push('Datos del garante');
      else if (d.garantia?.tipo === 'propietaria') pendientes.push('Datos del garante');
      cargado('Nombre del propietario', unir(propietario?.nombre, propietario?.apellido));
      cargado('DNI del propietario', propietario?.dni);
      cargado('Domicilio del propietario', propietario?.domicilio);
      cargado('Teléfono del propietario', propietario?.telefono);
      cargado('Email del propietario', propietario?.email);
      setResumenCarga({ estado: d.solicitud.estado, completados, pendientes, datosIlegibles: d.datosIlegibles });
      mostrar('Datos de la solicitud cargados. Revisalos y editá lo que haga falta.', 'exito');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudieron cargar los datos de la solicitud', 'peligro');
    } finally {
      setCargandoSolicitud(false);
    }
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
  const domicilioPropiedad = datos.propiedadDireccion || datos.propiedadCiudad
    ? [...datos.propiedadDireccion.split(','), datos.propiedadCiudad, 'Entre Ríos']
        .map((parte) => parte.trim())
        .filter((parte, i, todas) => parte && todas.findIndex((otra) => otra.toLowerCase() === parte.toLowerCase()) === i)
        .join(', ')
    : '';
  const nombreCliente = unir(datos.clienteNombre, datos.clienteApellido);
  const nombrePropietario = unir(datos.propietarioNombre, datos.propietarioApellido);
  const nombreCotitular = unir(datos.cotitularNombre, datos.cotitularApellido);
  const nombreGarante = unir(datos.garanteNombre, datos.garanteApellido);
  const domicilioCliente = [datos.clienteDomicilio, datos.clienteLocalidad, datos.clienteProvincia].map((parte) => parte.trim()).filter(Boolean).join(', ');
  const tituloDocumento = TITULO_DOCUMENTO[datos.tipoContrato] ?? 'Contrato de locación';
  const solicitudSeleccionada = solicitudes.find((s) => s.id === solicitudElegida);
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobada');
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');

  const revisar = () => {
    const camposPendientes: string[] = [];
    const erroresFormato: Record<string, string> = {};

    if (!datos.clienteNombre.trim()) camposPendientes.push('clienteNombre');
    if (!datos.clienteDni.trim()) camposPendientes.push('clienteDni');
    else if (!dniValido(datos.clienteDni)) erroresFormato.clienteDni = 'Ingresá 7 u 8 números.';
    if (datos.clienteCuil.trim() && !cuilValido(datos.clienteCuil)) erroresFormato.clienteCuil = 'Ingresá 11 números.';
    if (!datos.clienteTelefono.trim()) camposPendientes.push('clienteTelefono');
    if (!datos.propiedadTitulo) camposPendientes.push('propiedadId');
    if (!datos.fechaInicio) camposPendientes.push('fechaInicio');
    if (!esVenta && !meses) camposPendientes.push('duracionMeses');
    if (!datos.montoMensual.trim()) camposPendientes.push('montoMensual');

    if (datos.cotitularDni.trim() && !dniValido(datos.cotitularDni)) erroresFormato.cotitularDni = 'Ingresá 7 u 8 números.';
    if (datos.cotitularCuil.trim() && !cuilValido(datos.cotitularCuil)) erroresFormato.cotitularCuil = 'Ingresá 11 números.';
    if (datos.garanteDni.trim() && !dniValido(datos.garanteDni)) erroresFormato.garanteDni = 'Ingresá 7 u 8 números.';
    if (datos.garanteCuil.trim() && !cuilValido(datos.garanteCuil)) erroresFormato.garanteCuil = 'Ingresá 11 números.';
    if (datos.propietarioDni.trim() && !dniValido(datos.propietarioDni)) erroresFormato.propietarioDni = 'Ingresá 7 u 8 números.';

    setFaltan(camposPendientes);
    setFormatos(erroresFormato);
    return camposPendientes.length === 0 && Object.keys(erroresFormato).length === 0;
  };

  const guardar = async (nuevoEstado: 'borrador' | 'activo') => {
    if (!revisar()) {
      mostrar('Faltan datos obligatorios o hay formatos para corregir: están marcados en el formulario.', 'peligro');
      return;
    }
    setGuardando(nuevoEstado);
    const marca = ahoraTexto();

    const cotitular = datos.cotitularNombre.trim() || datos.cotitularApellido.trim() || datos.cotitularDni.trim() || datos.cotitularTelefono.trim()
      ? {
          nombre: datos.cotitularNombre.trim(),
          apellido: datos.cotitularApellido.trim(),
          dni: datos.cotitularDni.trim(),
          cuil: datos.cotitularCuil.trim(),
          domicilio: datos.cotitularDomicilio.trim(),
          localidad: datos.cotitularLocalidad.trim(),
          provincia: datos.cotitularProvincia.trim(),
          telefono: datos.cotitularTelefono.trim(),
          email: datos.cotitularEmail.trim(),
        }
      : undefined;
    const garante = datos.garanteNombre.trim() || datos.garanteApellido.trim() || datos.garanteDni.trim() || datos.garanteTelefono.trim()
      ? {
          nombre: datos.garanteNombre.trim(),
          apellido: datos.garanteApellido.trim(),
          dni: datos.garanteDni.trim(),
          cuil: datos.garanteCuil.trim(),
          domicilio: datos.garanteDomicilio.trim(),
          localidad: datos.garanteLocalidad.trim(),
          provincia: datos.garanteProvincia.trim(),
          telefono: datos.garanteTelefono.trim(),
          email: datos.garanteEmail.trim(),
        }
      : undefined;
    const propietario = datos.propietarioNombre.trim() || datos.propietarioApellido.trim() || datos.propietarioDni.trim() || datos.propietarioDomicilio.trim() || datos.propietarioTelefono.trim() || datos.propietarioEmail.trim()
      ? {
          nombre: datos.propietarioNombre.trim(),
          apellido: datos.propietarioApellido.trim(),
          dni: datos.propietarioDni.trim(),
          domicilio: datos.propietarioDomicilio.trim(),
          telefono: datos.propietarioTelefono.trim(),
          email: datos.propietarioEmail.trim(),
        }
      : undefined;

    const campos: Omit<ContratoInput, 'numeroContrato'> = {
      cliente: {
        ...(datos.clienteUsuarioId ? { usuario: datos.clienteUsuarioId } : {}),
        nombre: datos.clienteNombre.trim(),
        apellido: datos.clienteApellido.trim(),
        dni: datos.clienteDni.trim(),
        cuil: datos.clienteCuil.trim(),
        telefono: datos.clienteTelefono.trim(),
        email: datos.clienteEmail.trim(),
        domicilio: datos.clienteDomicilio.trim(),
        localidad: datos.clienteLocalidad.trim(),
        provincia: datos.clienteProvincia.trim(),
      },
      ...(cotitular ? { cotitular } : {}),
      ...(garante ? { garante } : {}),
      tipoGarantia: !esVenta && datos.incluyeGarante ? datos.tipoGarantia : undefined,
      ...(propietario ? { propietario } : {}),
      ...(datos.solicitudId ? { solicitud: datos.solicitudId } : {}),
      ...(datos.publicacionId ? { publicacion: datos.publicacionId } : {}),
      propiedad: { id: datos.propiedadId || undefined, titulo: datos.propiedadTitulo, direccion: domicilioPropiedad || datos.propiedadTitulo },
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
      locadora: nombrePropietario,
      locadoraDni: datos.propietarioDni.trim(),
      ...(datos.propietarioUsuarioId ? { locadoraUsuario: datos.propietarioUsuarioId } : {}),
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

  const textoEnvio = `Hola ${nombreCliente}, te escribimos de Negocios Inmobiliarios por el ${tituloDocumento.toLowerCase()} de "${datos.propiedadTitulo}". Te lo adjuntamos para que lo revises.`;
  const whatsapp = enlaceWhatsApp(datos.clienteTelefono, textoEnvio);
  const correo = datos.clienteEmail
    ? `mailto:${datos.clienteEmail}?subject=${encodeURIComponent(`${tituloDocumento} - ${datos.propiedadTitulo}`)}&body=${encodeURIComponent(textoEnvio)}`
    : null;

  const error = (campo: string, texto: string) => formatos[campo] ?? (faltan.includes(campo) ? texto : null);

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

      <div className="mb-6">
        <Tarjeta
          titulo="Cargar datos desde una solicitud"
          descripcion="Elegí una solicitud de alquiler o compra para completar el contrato con los datos que ya cargó el cliente. Después podés editar todo."
        >
          <div className="grid gap-4">
            <Campo
              etiqueta="Solicitud"
              htmlFor={`${id}-solicitud`}
              ayuda="Primero aparecen las aprobadas. Las pendientes se pueden usar igual, con un aviso."
            >
              <select
                id={`${id}-solicitud`}
                value={solicitudElegida}
                onChange={(e) => cargarDesdeSolicitud(e.target.value)}
                disabled={cargandoSolicitud}
                className={control}
              >
                <option value="">{cargandoSolicitud ? 'Cargando datos…' : 'Elegí una solicitud'}</option>
                {aprobadas.length > 0 && (
                  <optgroup label="Aprobadas">
                    {aprobadas.map((solicitud) => (
                      <option key={solicitud.id} value={solicitud.id}>
                        {unir(solicitud.titular.nombre, solicitud.titular.apellido) || 'Sin titular'} · {solicitud.propiedad?.titulo || 'Propiedad'} · {fechaCorta(solicitud.createdAt)} · {solicitud.operacion === 'compra' ? 'Compra' : 'Alquiler'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {pendientes.length > 0 && (
                  <optgroup label="Pendientes">
                    {pendientes.map((solicitud) => (
                      <option key={solicitud.id} value={solicitud.id}>
                        {unir(solicitud.titular.nombre, solicitud.titular.apellido) || 'Sin titular'} · {solicitud.propiedad?.titulo || 'Propiedad'} · {fechaCorta(solicitud.createdAt)} · Pendiente
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Campo>

            {solicitudes.length === 0 && (
              <p className="m-0 text-[13px] text-panel-suave">Todavía no hay solicitudes de alquiler o compra para usar.</p>
            )}

            {solicitudSeleccionada?.estado === 'pendiente' && (
              <Alerta tono="aviso" titulo="La solicitud todavía está pendiente">
                Se puede usar para precargar el contrato, pero conviene revisar los datos y confirmar la operación antes de guardarlo.
              </Alerta>
            )}

            {resumenCarga && (
              <Alerta
                tono={resumenCarga.estado === 'aprobada' ? 'exito' : 'aviso'}
                titulo={resumenCarga.estado === 'aprobada' ? 'Datos cargados de una solicitud aprobada' : 'Datos cargados de una solicitud pendiente'}
              >
                <p className="m-0">Se completaron: {resumenCarga.completados.join(', ')}.</p>
                {resumenCarga.datosIlegibles && (
                  <p className="m-0 mt-1">
                    No pudimos leer los datos personales guardados en esta solicitud (puede ser una solicitud vieja). Se cargaron la propiedad, la operación y el dueño; completá el resto a mano.
                  </p>
                )}
                {resumenCarga.pendientes.length > 0 && (
                  <p className="m-0 mt-1">Quedaron para completar a mano: {resumenCarga.pendientes.join(', ')}. No hace falta que estén todos para guardar.</p>
                )}
                <p className="m-0 mt-1">Todos los campos siguen siendo editables.</p>
              </Alerta>
            )}
          </div>
        </Tarjeta>
      </div>

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
              <Campo etiqueta="Perfil registrado" htmlFor={`${id}-perfil`} ayuda="Al elegir una cuenta se completan nombre, DNI, teléfono y email.">
                <select id={`${id}-perfil`} value={datos.clienteUsuarioId} onChange={(e) => elegirUsuario(e.target.value)} className={control}>
                  <option value="">Carga manual (sin cuenta)</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} · DNI {usuario.dni}
                    </option>
                  ))}
                </select>
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre del cliente *" htmlFor={`${id}-cli`} error={error('clienteNombre', 'Escribí el nombre del cliente.')}>
                  <input id={`${id}-cli`} type="text" value={datos.clienteNombre} aria-invalid={faltan.includes('clienteNombre')} onChange={(e) => cambiar('clienteNombre', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Apellido del cliente" htmlFor={`${id}-cli-apellido`}>
                  <input id={`${id}-cli-apellido`} type="text" value={datos.clienteApellido} onChange={(e) => cambiar('clienteApellido', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="DNI *" htmlFor={`${id}-dni`} error={error('clienteDni', 'Escribí el DNI.')}>
                  <input id={`${id}-dni`} type="text" inputMode="numeric" value={datos.clienteDni} aria-invalid={faltan.includes('clienteDni')} onChange={(e) => cambiar('clienteDni', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="CUIL / CUIT" htmlFor={`${id}-cuil`} error={error('clienteCuil', 'Ingresá 11 números.')} ayuda="11 números, sin guiones.">
                  <input id={`${id}-cuil`} type="text" inputMode="numeric" value={datos.clienteCuil} onChange={(e) => cambiar('clienteCuil', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Teléfono *" htmlFor={`${id}-tel`} error={error('clienteTelefono', 'Escribí el teléfono.')}>
                  <input id={`${id}-tel`} type="tel" value={datos.clienteTelefono} aria-invalid={faltan.includes('clienteTelefono')} onChange={(e) => cambiar('clienteTelefono', e.target.value)} placeholder="Ej.: 343 444 4444" className={control} />
                </Campo>
                <Campo etiqueta="Email" htmlFor={`${id}-mail`}>
                  <input id={`${id}-mail`} type="email" value={datos.clienteEmail} onChange={(e) => cambiar('clienteEmail', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Domicilio" htmlFor={`${id}-domicilio`} className="sm:col-span-2">
                  <input id={`${id}-domicilio`} type="text" value={datos.clienteDomicilio} onChange={(e) => cambiar('clienteDomicilio', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Localidad" htmlFor={`${id}-localidad`}>
                  <input id={`${id}-localidad`} type="text" value={datos.clienteLocalidad} onChange={(e) => cambiar('clienteLocalidad', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Provincia" htmlFor={`${id}-provincia`}>
                  <input id={`${id}-provincia`} type="text" value={datos.clienteProvincia} onChange={(e) => cambiar('clienteProvincia', e.target.value)} className={control} />
                </Campo>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo={esVenta ? 'Propietario / vendedor' : 'Propietario / locador'} descripcion="Se completa desde la publicación o desde la propiedad. Podés corregirlo si actúa un apoderado.">
            <div className="grid gap-4">
              <Campo etiqueta="Perfil registrado" htmlFor={`${id}-locador-perfil`}>
                <select id={`${id}-locador-perfil`} value={datos.propietarioUsuarioId} onChange={(e) => elegirPropietario(e.target.value)} className={control}>
                  <option value="">Carga manual</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>{usuario.nombre} · DNI {usuario.dni}</option>
                  ))}
                </select>
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta={esVenta ? 'Nombre del vendedor' : 'Nombre del locador'} htmlFor={`${id}-loc`}>
                  <input id={`${id}-loc`} type="text" value={datos.propietarioNombre} onChange={(e) => cambiar('propietarioNombre', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Apellido" htmlFor={`${id}-loc-apellido`}>
                  <input id={`${id}-loc-apellido`} type="text" value={datos.propietarioApellido} onChange={(e) => cambiar('propietarioApellido', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="DNI" htmlFor={`${id}-loc-dni`} error={error('propietarioDni', 'Ingresá 7 u 8 números.')}>
                  <input id={`${id}-loc-dni`} type="text" inputMode="numeric" value={datos.propietarioDni} onChange={(e) => cambiar('propietarioDni', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Teléfono" htmlFor={`${id}-loc-tel`}>
                  <input id={`${id}-loc-tel`} type="tel" value={datos.propietarioTelefono} onChange={(e) => cambiar('propietarioTelefono', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Email" htmlFor={`${id}-loc-mail`}>
                  <input id={`${id}-loc-mail`} type="email" value={datos.propietarioEmail} onChange={(e) => cambiar('propietarioEmail', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Domicilio" htmlFor={`${id}-loc-dom`} ayuda={datos.solicitudId && !datos.propietarioDomicilio ? 'La solicitud de publicación no trae el domicilio del dueño: completalo si hace falta.' : undefined}>
                  <input id={`${id}-loc-dom`} type="text" value={datos.propietarioDomicilio} onChange={(e) => cambiar('propietarioDomicilio', e.target.value)} className={control} />
                </Campo>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Cotitular (opcional)" descripcion="Si la solicitud tiene cotitular, se completa solo. Si no, podés dejarlo vacío.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" htmlFor={`${id}-coti-nombre`}>
                <input id={`${id}-coti-nombre`} type="text" value={datos.cotitularNombre} onChange={(e) => cambiar('cotitularNombre', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Apellido" htmlFor={`${id}-coti-apellido`}>
                <input id={`${id}-coti-apellido`} type="text" value={datos.cotitularApellido} onChange={(e) => cambiar('cotitularApellido', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="DNI" htmlFor={`${id}-coti-dni`} error={error('cotitularDni', 'Ingresá 7 u 8 números.')}>
                <input id={`${id}-coti-dni`} type="text" inputMode="numeric" value={datos.cotitularDni} onChange={(e) => cambiar('cotitularDni', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="CUIL / CUIT" htmlFor={`${id}-coti-cuil`} error={error('cotitularCuil', 'Ingresá 11 números.')}>
                <input id={`${id}-coti-cuil`} type="text" inputMode="numeric" value={datos.cotitularCuil} onChange={(e) => cambiar('cotitularCuil', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Teléfono" htmlFor={`${id}-coti-tel`}>
                <input id={`${id}-coti-tel`} type="tel" value={datos.cotitularTelefono} onChange={(e) => cambiar('cotitularTelefono', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Email" htmlFor={`${id}-coti-mail`}>
                <input id={`${id}-coti-mail`} type="email" value={datos.cotitularEmail} onChange={(e) => cambiar('cotitularEmail', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Domicilio" htmlFor={`${id}-coti-dom`} className="sm:col-span-2">
                <input id={`${id}-coti-dom`} type="text" value={datos.cotitularDomicilio} onChange={(e) => cambiar('cotitularDomicilio', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Localidad" htmlFor={`${id}-coti-loc`}>
                <input id={`${id}-coti-loc`} type="text" value={datos.cotitularLocalidad} onChange={(e) => cambiar('cotitularLocalidad', e.target.value)} className={control} />
              </Campo>
              <Campo etiqueta="Provincia" htmlFor={`${id}-coti-prov`}>
                <input id={`${id}-coti-prov`} type="text" value={datos.cotitularProvincia} onChange={(e) => cambiar('cotitularProvincia', e.target.value)} className={control} />
              </Campo>
            </div>
          </Tarjeta>

          {!esVenta && (
            <Tarjeta titulo="Garante (opcional)" descripcion="Viene de la garantía de la solicitud. Si es seguro de caución, podés dejarlo vacío.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" htmlFor={`${id}-gar-nombre`}>
                  <input id={`${id}-gar-nombre`} type="text" value={datos.garanteNombre} onChange={(e) => cambiar('garanteNombre', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Apellido" htmlFor={`${id}-gar-apellido`}>
                  <input id={`${id}-gar-apellido`} type="text" value={datos.garanteApellido} onChange={(e) => cambiar('garanteApellido', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="DNI" htmlFor={`${id}-gar-dni`} error={error('garanteDni', 'Ingresá 7 u 8 números.')}>
                  <input id={`${id}-gar-dni`} type="text" inputMode="numeric" value={datos.garanteDni} onChange={(e) => cambiar('garanteDni', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="CUIL / CUIT" htmlFor={`${id}-gar-cuil`} error={error('garanteCuil', 'Ingresá 11 números.')}>
                  <input id={`${id}-gar-cuil`} type="text" inputMode="numeric" value={datos.garanteCuil} onChange={(e) => cambiar('garanteCuil', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Teléfono" htmlFor={`${id}-gar-tel`}>
                  <input id={`${id}-gar-tel`} type="tel" value={datos.garanteTelefono} onChange={(e) => cambiar('garanteTelefono', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Email" htmlFor={`${id}-gar-mail`}>
                  <input id={`${id}-gar-mail`} type="email" value={datos.garanteEmail} onChange={(e) => cambiar('garanteEmail', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Domicilio" htmlFor={`${id}-gar-dom`} className="sm:col-span-2">
                  <input id={`${id}-gar-dom`} type="text" value={datos.garanteDomicilio} onChange={(e) => cambiar('garanteDomicilio', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Localidad" htmlFor={`${id}-gar-loc`}>
                  <input id={`${id}-gar-loc`} type="text" value={datos.garanteLocalidad} onChange={(e) => cambiar('garanteLocalidad', e.target.value)} className={control} />
                </Campo>
                <Campo etiqueta="Provincia" htmlFor={`${id}-gar-prov`}>
                  <input id={`${id}-gar-prov`} type="text" value={datos.garanteProvincia} onChange={(e) => cambiar('garanteProvincia', e.target.value)} className={control} />
                </Campo>
              </div>
            </Tarjeta>
          )}

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
              {!esVenta && datos.incluyeGarante && (
                <Campo etiqueta="Tipo de garantía" htmlFor={`${id}-tipo-garantia`} ayuda="Según lo que haya presentado el cliente.">
                  <select id={`${id}-tipo-garantia`} value={datos.tipoGarantia} onChange={(e) => cambiar('tipoGarantia', e.target.value as Datos['tipoGarantia'])} className={control}>
                    <option value="propietaria">Garantía propietaria</option>
                    <option value="caucion">Seguro de caución</option>
                  </select>
                </Campo>
              )}
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
                Entre <Hueco valor={nombrePropietario} texto={parteDuena} />, DNI <Hueco valor={datos.propietarioDni} texto="DNI" />, con domicilio en <Hueco valor={datos.propietarioDomicilio} texto="domicilio del propietario" />, en adelante «LA {parteDuena.toUpperCase()}», y <Hueco valor={nombreCliente} texto="cliente" />, DNI <Hueco valor={datos.clienteDni} texto="DNI" />, CUIL/CUIT <Hueco valor={datos.clienteCuil} texto="CUIL" />, con domicilio en <Hueco valor={domicilioCliente} texto="domicilio del cliente" />, en adelante «LA {parteCliente.toUpperCase()}»
                {nombreCotitular && <>, y <Hueco valor={nombreCotitular} texto="cotitular" />, DNI <Hueco valor={datos.cotitularDni} texto="DNI" />, en carácter de cotitular</>}, se celebra el presente {esVenta ? 'boleto' : 'contrato'} sobre el inmueble ubicado en{' '}
                <Hueco valor={domicilioPropiedad} texto="propiedad" />, sujeto a las siguientes cláusulas:
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
                  <strong>{datos.depositoGarantia ? 'CUARTA' : 'TERCERA'}:</strong> La parte locataria presenta garantía {datos.tipoGarantia === 'caucion' ? 'de seguro de caución' : 'propietaria'}
                  {datos.tipoGarantia === 'propietaria' && (
                    <>
                      {' '}a cargo de <Hueco valor={nombreGarante} texto="garante" />, DNI <Hueco valor={datos.garanteDni} texto="DNI" />, con domicilio en <Hueco valor={datos.garanteDomicilio} texto="domicilio del garante" />
                    </>
                  )}
                  ; el fiador se constituye en principal pagador y responde solidariamente por todas las obligaciones de este contrato.
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
                  <span className="block font-semibold">{nombrePropietario || ' '}</span>
                  <span className="block text-slate-500">{datos.propietarioDni ? `DNI ${datos.propietarioDni}` : 'DNI pendiente'}</span>
                  <span className="text-slate-500">{esVenta ? 'Parte vendedora' : 'Parte locadora'}</span>
                </div>
                <div>
                  <div className="mb-2 border-t border-slate-400" />
                  <span className="block font-semibold">{nombreCliente || ' '}</span>
                  <span className="block text-slate-500">{datos.clienteDni ? `DNI ${datos.clienteDni}` : 'DNI pendiente'}</span>
                  <span className="text-slate-500">{esVenta ? 'Parte compradora' : 'Parte locataria'}</span>
                </div>
                {nombreCotitular && (
                  <div>
                    <div className="mb-2 border-t border-slate-400" />
                    <span className="block font-semibold">{nombreCotitular}</span>
                    <span className="block text-slate-500">{datos.cotitularDni ? `DNI ${datos.cotitularDni}` : 'DNI pendiente'}</span>
                    <span className="text-slate-500">Cotitular</span>
                  </div>
                )}
                {!esVenta && datos.incluyeGarante && datos.tipoGarantia === 'propietaria' && nombreGarante && (
                  <div>
                    <div className="mb-2 border-t border-slate-400" />
                    <span className="block font-semibold">{nombreGarante}</span>
                    <span className="block text-slate-500">{datos.garanteDni ? `DNI ${datos.garanteDni}` : 'DNI pendiente'}</span>
                    <span className="text-slate-500">Garante</span>
                  </div>
                )}
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
