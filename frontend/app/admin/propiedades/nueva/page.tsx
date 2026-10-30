"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Icono from "@/components/panel/Icono";
import { Boton, BotonLink, Campo, Encabezado, Esqueleto, Tarjeta, areaTexto, control } from "@/components/panel/ui";
import { createProperty, getDolarBlueQuote, getLocalidades, getPropertyById, resolveMapsLink, updateProperty, uploadPropertyImages } from "../../../../services/api";

const SelectorUbicacionMapa = dynamic(
  () => import("../../../../components/SelectorUbicacionMapa"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
        Cargando mapa interactivo...
      </div>
    ),
  }
);

type OperacionSolicitud = "venta" | "alquiler";
const operacionSolicitable = (categoria: string): OperacionSolicitud | null =>
  categoria === "venta" || categoria === "alquiler" ? categoria : null;

// Límites aproximados de Entre Ríos (con margen): el backend controla lo mismo
const dentroDeEntreRios = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34.3 && lat <= -29.9 && lng >= -61 && lng <= -57.4;

export default function NuevaPropiedadPage() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  // Paso actual del formulario y pasos que ya fueron completados
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [pasosCompletados, setPasosCompletados] = useState<number[]>([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Paso 1
    titulo: "",
    codigoInterno: "",
    tipoInmueble: "",
    categoriaOperacion: "",
    ciudadZonaBarrio: "",
    provincia: "entre_rios",
    direccionCompleta: "",
    referenciasUbicacion: "",
    precioUSD: "",
    moneda: "USD",
    precioARS: "",
    cotizacionDolar: "",
    expensas: "",
    montoExpensas: "",
    superficieTotal: "",
    cantidadAmbientes: "",
    dormitorios: "",
    banos: "",
    cochera: "",
    pisoUnidad: "",
    otrasComodidades: "",

    // Paso 2
    descripcion: "",
    linkGoogleMaps: "",
    latitud: "",
    longitud: "",
    permitirVisita: true,
    permitirWhatsApp: true,
    permitirEmail: true,
    permitirSolicitudes: true,
    operacionesSolicitud: [] as ("venta" | "alquiler")[],
    horarioAtencion: "",
    telefonoWhatsApp: "",

    // Alquiler temporario
    precioPorNocheUSD: "",
    minimoNoches: "",
    huespedesMaximos: "",
    costoLimpiezaUSD: "",
    duracionAlquilerMeses: "",
    unidadDuracionAlquiler: "meses",
    checkInDesde: "",
    checkOutHasta: "",
    checkInFlexible: "",

    // HU-12: descuento y financiación
    descuentoPorcentaje: "",
    descuentoHasta: "",
    descuentoMotivo: "",
    financiacionDisponible: false,
    anticipoPorcentaje: "",
    cuotas: "",
    tasa: "",
    financiacionDetalle: "",
  });

  const [comodidadesSeleccionadas, setComodidadesSeleccionadas] = useState<string[]>([]);

  // Imágenes cargadas para la propiedad
  const [imagenes, setImagenes] = useState<string[]>([]);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoPropiedad, setEstadoPropiedad] = useState<"disponible" | "reservado" | "alquilado" | "vendido">("disponible");
  const [mostrarTodoEdicion, setMostrarTodoEdicion] = useState(true);
  // Al editar, se muestra un esqueleto hasta que llegan los datos de la propiedad
  const [cargandoPropiedad, setCargandoPropiedad] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("editar"));
  const [guardando, setGuardando] = useState(false);
  const [arrastrandoImagenes, setArrastrandoImagenes] = useState(false);
  const [resolviendoMapa, setResolviendoMapa] = useState(false);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});
  const [cotizacionBlue, setCotizacionBlue] = useState<number | null>(null);
  const [fechaCotizacionBlue, setFechaCotizacionBlue] = useState<string | null>(null);
  const [estadoCotizacionBlue, setEstadoCotizacionBlue] = useState<"inicial" | "cargando" | "disponible" | "error">("inicial");

  // Quitar el mensaje de error cuando se corrige un campo
  const limpiarErrorCampo = (campo: string) => {
    setErroresCampos((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
    setMensaje("");
  };

  const esVivienda = formData.tipoInmueble === "casa" || formData.tipoInmueble === "departamento";
  const esTerreno = formData.tipoInmueble === "terreno";
  const permiteAlquilerTemporario = esVivienda;

  // Obtener coordenadas desde un enlace de Google Maps
  const completarCoordenadasDesdeLink = async (link: string) => {
    const coordinates = link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      ?? link.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      ?? link.match(/\/search\/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/);

    if (coordinates) {
      setFormData((current) => ({ ...current, latitud: coordinates[1], longitud: coordinates[2] }));
      return;
    }

    if (!link.includes("maps.app.goo.gl") && !link.includes("goo.gl/maps")) return;

    try {
      setResolviendoMapa(true);
      const resolved = await resolveMapsLink(link);
      setFormData((current) => ({ ...current, latitud: resolved.latitud, longitud: resolved.longitud }));
    } catch {
      setMensaje("No se pudieron obtener coordenadas de ese enlace; podés ingresarlas manualmente.");
    } finally {
      setResolviendoMapa(false);
    }
  };

  // Cargar localidades y, si corresponde, los datos de la propiedad a editar
  useEffect(() => {
    getLocalidades()
      .then((items) => setLocalidades(items.map((item) => item.nombre)))
      .catch(() => setMensaje("No se pudieron cargar las localidades"));

    const id = new URLSearchParams(window.location.search).get("editar");
    if (!id) return;

    getPropertyById(id)
      .then((property) => {
        setModoEdicion(true);
        if (property.estado) {
          setEstadoPropiedad(property.estado);
        }
        setFormData((current) => ({
          ...current,
          titulo: property.title ?? "",
          codigoInterno: property.codigoInterno ?? "",
          tipoInmueble: property.tipo_inmueble === "monoambiente" ? "departamento" : property.tipo_inmueble ?? current.tipoInmueble,
          categoriaOperacion: property.categoria_operacion === "temporario" && !["casa", "departamento"].includes(property.tipo_inmueble ?? "")
            ? "venta"
            : property.categoria_operacion ?? current.categoriaOperacion,
          ciudadZonaBarrio: property.ciudad ?? "",
          provincia: property.provincia === "entre_rios" ? property.provincia : "entre_rios",
          direccionCompleta: property.direccionCompleta ?? property.location ?? "",
          referenciasUbicacion: property.referenciasUbicacion ?? "",
          precioUSD: String(property.price ?? ""),
          moneda: property.moneda ?? "USD",
          precioARS: String(property.priceARS ?? ""),
          cotizacionDolar: String(property.cotizacionDolar ?? current.cotizacionDolar),
          expensas: property.expensas ?? current.expensas,
          montoExpensas: String(property.montoExpensas ?? ""),
          superficieTotal: String(property.area ?? ""),
          cantidadAmbientes: String(property.cantidad_ambientes ?? ""),
          dormitorios: String(property.bedrooms ?? ""),
          banos: String(property.bathrooms ?? ""),
          cochera: property.cochera ?? "no",
          pisoUnidad: property.pisoUnidad ?? "",
          otrasComodidades: property.otrasComodidades ?? "",
          descripcion: property.description ?? "",
          linkGoogleMaps: property.linkGoogleMaps ?? "",
          latitud: property.latitud ?? "",
          longitud: property.longitud ?? "",
          permitirVisita: property.permitirVisita ?? true,
          permitirWhatsApp: property.permitirWhatsApp ?? true,
          permitirEmail: property.permitirEmail ?? true,
          permitirSolicitudes: property.permitirSolicitudes ?? true,
          operacionesSolicitud: property.operacionesSolicitud?.length
            ? property.operacionesSolicitud
            : property.categoria_operacion === "venta" || property.categoria_operacion === "alquiler"
              ? [property.categoria_operacion]
              : [],
          horarioAtencion: property.horarioAtencion ?? current.horarioAtencion,
          telefonoWhatsApp: property.telefonoWhatsApp ?? "",
          precioPorNocheUSD: String(property.precioPorNocheUSD ?? ""),
          minimoNoches: String(property.minimoNoches ?? ""),
          huespedesMaximos: String(property.huespedesMaximos ?? ""),
          costoLimpiezaUSD: String(property.costoLimpiezaUSD ?? ""),
          duracionAlquilerMeses: property.duracionAlquilerMeses
            ? String(property.duracionAlquilerMeses >= 12 && property.duracionAlquilerMeses % 12 === 0
              ? property.duracionAlquilerMeses / 12
              : property.duracionAlquilerMeses)
            : "",
          unidadDuracionAlquiler: property.unidadDuracionAlquiler ?? (property.duracionAlquilerMeses && property.duracionAlquilerMeses >= 12 && property.duracionAlquilerMeses % 12 === 0 ? "años" : "meses"),
          checkInDesde: property.checkInDesde ?? "",
          checkOutHasta: property.checkOutHasta ?? "",
          checkInFlexible: property.checkInFlexible ?? "si",
          descuentoPorcentaje: property.descuento?.porcentaje ? String(property.descuento.porcentaje) : "",
          descuentoHasta: property.descuento?.hasta ? String(property.descuento.hasta).slice(0, 10) : "",
          descuentoMotivo: property.descuento?.motivo ?? "",
          financiacionDisponible: Boolean(property.financiacion?.disponible),
          anticipoPorcentaje: property.financiacion?.anticipoPorcentaje ? String(property.financiacion.anticipoPorcentaje) : "",
          cuotas: property.financiacion?.cuotas ? String(property.financiacion.cuotas) : "",
          tasa: property.financiacion?.tasa ?? "",
          financiacionDetalle: property.financiacion?.detalle ?? "",
        }));
        setComodidadesSeleccionadas(property.comodidades ?? []);
        setImagenes(property.images ?? []);
        if (property.linkGoogleMaps && (!property.latitud || !property.longitud)) {
          void completarCoordenadasDesdeLink(property.linkGoogleMaps);
        }
      })
      .catch((error) => setMensaje(error instanceof Error ? error.message : "No se pudo cargar la propiedad"))
      .finally(() => setCargandoPropiedad(false));
  }, []);

  // Actualizar la cotización cuando se llega al paso de precios
  useEffect(() => {
    if (pasoActual !== 2 && !modoEdicion) return;

    let activo = true;
    getDolarBlueQuote()
      .then((quote) => {
        if (!activo) return;
        setCotizacionBlue(quote.venta);
        setFechaCotizacionBlue(quote.fechaActualizacion ?? null);
        setFormData((current) => ({ ...current, cotizacionDolar: String(quote.venta) }));
        setEstadoCotizacionBlue("disponible");
      })
      .catch(() => {
        if (activo) setEstadoCotizacionBlue("error");
      });

    return () => {
      activo = false;
    };
  }, [modoEdicion, pasoActual]);

  const eliminarImagen = (indexAEliminar: number) => {
    setImagenes((prev) => prev.filter((_, idx) => idx !== indexAEliminar));
  };

  // La primera foto es la portada: mueve la elegida al principio
  const hacerPortada = (indice: number) => {
    setImagenes((prev) => [prev[indice], ...prev.filter((_, idx) => idx !== indice)]);
  };

  const toggleComodidad = (item: string) => {
    setComodidadesSeleccionadas((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  // Evitar que se ingresen valores numéricos negativos
  const handleNonNegativeNumberChange = (field: string, value: string) => {
    if (value === "" || Number(value) >= 0) {
      setFormData((current) => ({ ...current, [field]: value }));
    }
  };

  const actualizarUbicacionTexto = (field: "linkGoogleMaps" | "direccionCompleta" | "ciudadZonaBarrio", value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const comodidadesList = [
    { id: "aire", label: "Aire acondicionado", icon: "❄️" },
    { id: "ascensor", label: "Ascensor", icon: "🛗" },
    { id: "cocina", label: "Cocina equipada", icon: "🍳" },
    { id: "balcon", label: "Balcón", icon: "🏢" },
    { id: "wifi", label: "Wifi", icon: "📶" },
    { id: "tv", label: "TV", icon: "📺" },
    { id: "seguridad", label: "Seguridad 24h", icon: "🛡️" },
    { id: "cochera_cubierta", label: "Cochera cubierta", icon: "🚗" },
    { id: "calefaccion", label: "Calefacción", icon: "♨️" },
    { id: "pileta", label: "Pileta", icon: "🏊" },
    { id: "parrilla", label: "Parrilla", icon: "🥩" },
    { id: "laundry", label: "Laundry", icon: "🧺" },
  ];

  const subirArchivos = async (filesArray: File[]) => {
    if (filesArray.length > 0) {
      // Revisar tamaño y formato antes de enviarlas al servidor
      const oversizedFile = filesArray.find((file) => file.size > 10 * 1024 * 1024);

      if (oversizedFile) {
        setMensaje(`La imagen "${oversizedFile.name}" supera el límite de 10 MB`);
        return;
      }

      const invalidFile = filesArray.find((file) => !file.type.startsWith("image/"));
      if (invalidFile) {
        setMensaje(`El archivo "${invalidFile.name}" no es una imagen válida`);
        return;
      }

      try {
        setMensaje("Subiendo imágenes...");
        const newUrls = await uploadPropertyImages(filesArray);
        setImagenes((prev) => [...prev, ...newUrls].slice(0, 20));
        setMensaje(`${newUrls.length} imagen${newUrls.length === 1 ? "" : "es"} subida${newUrls.length === 1 ? "" : "s"} correctamente`);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudieron subir las imágenes");
      }
    }
  };

  const handleSubirImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await subirArchivos(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleSoltarImagenes = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setArrastrandoImagenes(false);
    await subirArchivos(Array.from(e.dataTransfer.files));
  };

  // Validar los campos propios de cada paso del formulario
  const validarDetallePaso = (paso: number): { valid: boolean; error?: string; field?: string } => {
    if (paso === 1) {
      if (!formData.titulo.trim()) {
        return { valid: false, error: "El título de publicación es obligatorio", field: "titulo" };
      }
      if (formData.titulo.trim().length < 5) {
        return { valid: false, error: "El título debe tener al menos 5 caracteres", field: "titulo" };
      }
      if (!formData.tipoInmueble) {
        return { valid: false, error: "Seleccioná el tipo de inmueble", field: "tipoInmueble" };
      }
      if (!formData.categoriaOperacion) {
        return { valid: false, error: "Seleccioná la categoría u operación", field: "categoriaOperacion" };
      }
      if (!formData.ciudadZonaBarrio.trim()) {
        return { valid: false, error: "Seleccioná la localidad", field: "ciudadZonaBarrio" };
      }
      if (!formData.direccionCompleta.trim()) {
        return { valid: false, error: "La dirección es obligatoria", field: "direccionCompleta" };
      }
      return { valid: true };
    }

    if (paso === 2) {
      const precioStr = formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD;
      if (!precioStr || !precioStr.trim()) {
        return { valid: false, error: `El precio en ${formData.moneda} es obligatorio`, field: "precio" };
      }
      const precioNum = Number(precioStr);
      if (!Number.isFinite(precioNum) || precioNum <= 0) {
        return { valid: false, error: "El precio debe ser un número mayor a 0", field: "precio" };
      }
      if (formData.cotizacionDolar && (Number(formData.cotizacionDolar) <= 0 || !Number.isFinite(Number(formData.cotizacionDolar)))) {
        return { valid: false, error: "La cotización del dólar debe ser mayor a 0", field: "cotizacionDolar" };
      }
      if (formData.montoExpensas && (Number(formData.montoExpensas) < 0 || !Number.isFinite(Number(formData.montoExpensas)))) {
        return { valid: false, error: "El monto de expensas no puede ser negativo", field: "montoExpensas" };
      }
      if (formData.descuentoPorcentaje && !(Number(formData.descuentoPorcentaje) > 0 && Number(formData.descuentoPorcentaje) <= 90)) {
        return { valid: false, error: "El descuento tiene que ser un porcentaje entre 1 y 90", field: "descuentoPorcentaje" };
      }
      if (formData.financiacionDisponible) {
        const cuotas = Number(formData.cuotas);
        if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 360) {
          return { valid: false, error: "Indicá en cuántas cuotas se financia (de 1 a 360)", field: "cuotas" };
        }
        if (formData.anticipoPorcentaje && Number(formData.anticipoPorcentaje) > 100) {
          return { valid: false, error: "El anticipo no puede superar el 100 %", field: "anticipoPorcentaje" };
        }
      }
      return { valid: true };
    }

    if (paso === 3) {
      if (!formData.superficieTotal || !formData.superficieTotal.trim()) {
        return { valid: false, error: "La superficie total es obligatoria", field: "superficieTotal" };
      }
      const areaNum = Number(formData.superficieTotal);
      if (!Number.isFinite(areaNum) || areaNum <= 0) {
        return { valid: false, error: "La superficie total debe ser un número mayor a 0 m²", field: "superficieTotal" };
      }
      if (esVivienda) {
        if (!formData.cantidadAmbientes || !formData.cantidadAmbientes.trim()) {
          return { valid: false, error: "La cantidad de ambientes es obligatoria", field: "cantidadAmbientes" };
        }
        if (Number(formData.cantidadAmbientes) < 1 || !Number.isFinite(Number(formData.cantidadAmbientes))) {
          return { valid: false, error: "La cantidad de ambientes debe ser al menos 1", field: "cantidadAmbientes" };
        }
        if (!formData.dormitorios || !formData.dormitorios.trim()) {
          return { valid: false, error: "La cantidad de dormitorios es obligatoria", field: "dormitorios" };
        }
        if (Number(formData.dormitorios) < 0 || !Number.isFinite(Number(formData.dormitorios))) {
          return { valid: false, error: "La cantidad de dormitorios no puede ser negativa", field: "dormitorios" };
        }
        if (!formData.banos || !formData.banos.trim()) {
          return { valid: false, error: "La cantidad de baños es obligatoria", field: "banos" };
        }
        if (Number(formData.banos) < 1 || !Number.isFinite(Number(formData.banos))) {
          return { valid: false, error: "La cantidad de baños debe ser al menos 1", field: "banos" };
        }
      }
      return { valid: true };
    }

    if (paso === 4) {
      return { valid: true };
    }

    if (paso === 5) {
      if (formData.descripcion && formData.descripcion.length > 3000) {
        return { valid: false, error: "La descripción no puede superar los 3.000 caracteres", field: "descripcion" };
      }
      // Sin punto la propiedad no aparece en el mapa de la portada: la ubicación es obligatoria
      if (!formData.latitud.trim() || !formData.longitud.trim()) {
        return { valid: false, error: "Marcá la ubicación: pegá el link de Google Maps, buscá la dirección o tocá el punto en el mapa", field: "latitud" };
      }
      if (!dentroDeEntreRios(Number(formData.latitud), Number(formData.longitud))) {
        return { valid: false, error: "El punto quedó fuera de Entre Ríos. Revisá la ubicación en el mapa", field: "latitud" };
      }
      if (formData.latitud && (isNaN(Number(formData.latitud)) || Number(formData.latitud) < -90 || Number(formData.latitud) > 90)) {
        return { valid: false, error: "La latitud debe ser un valor válido entre -90 y 90", field: "latitud" };
      }
      if (formData.longitud && (isNaN(Number(formData.longitud)) || Number(formData.longitud) < -180 || Number(formData.longitud) > 180)) {
        return { valid: false, error: "La longitud debe ser un valor válido entre -180 y 180", field: "longitud" };
      }
      return { valid: true };
    }

    if (paso === 6) {
      if (imagenes.length > 20) {
        return { valid: false, error: "No podés subir más de 20 imágenes", field: "imagenes" };
      }
      const admiteSolicitud = formData.permitirSolicitudes
        && formData.categoriaOperacion !== "temporario"
        && (formData.operacionesSolicitud.length > 0 || operacionSolicitable(formData.categoriaOperacion) !== null);
      if (!formData.permitirVisita && !formData.permitirWhatsApp && !formData.permitirEmail && !admiteSolicitud) {
        return { valid: false, error: "Debés habilitar al menos una opción de contacto o una solicitud de compra/alquiler", field: "contacto" };
      }
      return { valid: true };
    }

    if (paso === 7) {
      if (formData.categoriaOperacion === "temporario" && permiteAlquilerTemporario) {
        if (!formData.precioPorNocheUSD || !formData.precioPorNocheUSD.trim()) {
          return { valid: false, error: "El precio por noche es obligatorio", field: "precioPorNocheUSD" };
        }
        if (Number(formData.precioPorNocheUSD) <= 0 || !Number.isFinite(Number(formData.precioPorNocheUSD))) {
          return { valid: false, error: "El precio por noche debe ser mayor a 0", field: "precioPorNocheUSD" };
        }
        if (!formData.minimoNoches || !formData.minimoNoches.trim()) {
          return { valid: false, error: "El mínimo de noches es obligatorio", field: "minimoNoches" };
        }
        if (Number(formData.minimoNoches) < 1 || !Number.isFinite(Number(formData.minimoNoches))) {
          return { valid: false, error: "El mínimo de noches debe ser al menos 1", field: "minimoNoches" };
        }
        if (!formData.huespedesMaximos || !formData.huespedesMaximos.trim()) {
          return { valid: false, error: "La cantidad de huéspedes es obligatoria", field: "huespedesMaximos" };
        }
        if (Number(formData.huespedesMaximos) < 1 || !Number.isFinite(Number(formData.huespedesMaximos))) {
          return { valid: false, error: "La cantidad de huéspedes debe ser al menos 1", field: "huespedesMaximos" };
        }
        if (formData.costoLimpiezaUSD && (Number(formData.costoLimpiezaUSD) < 0 || !Number.isFinite(Number(formData.costoLimpiezaUSD)))) {
          return { valid: false, error: "El costo de limpieza no puede ser negativo", field: "costoLimpiezaUSD" };
        }
      }
      if (formData.categoriaOperacion === "alquiler") {
        if (formData.unidadDuracionAlquiler === "meses" && Number(formData.duracionAlquilerMeses) > 11) {
          return { valid: false, error: "La duración en meses no puede superar los 11 meses", field: "duracionAlquilerMeses" };
        }
        if (formData.duracionAlquilerMeses && Number(formData.duracionAlquilerMeses) <= 0) {
          return { valid: false, error: "La duración del alquiler debe ser mayor a 0", field: "duracionAlquilerMeses" };
        }
      }
      return { valid: true };
    }

    return { valid: true };
  };

  const validarPaso = (paso: number): boolean => {
    const res = validarDetallePaso(paso);
    if (!res.valid) {
      const msg = res.error || "Completá los campos obligatorios antes de continuar";
      setMensaje(msg);
      if (res.field) {
        setErroresCampos({ [res.field]: msg });
      }
      return false;
    }
    setMensaje("");
    setErroresCampos({});
    return true;
  };

  const avanzarPaso = () => {
    if (!validarPaso(pasoActual)) return;
    // Los terrenos no usan el paso de comodidades
    const pasosActualizados = esTerreno && pasoActual === 3
      ? [pasoActual, 4]
      : [pasoActual];
    setPasosCompletados((current) => [...new Set([...current, ...pasosActualizados])]);
    const siguientePaso = esTerreno && pasoActual === 3 ? 5 : pasoActual < 7 ? pasoActual + 1 : 7;
    setPasoActual(siguientePaso as typeof pasoActual);
    setMensaje("");
    setErroresCampos({});
  };

  // Volver al paso anterior, teniendo en cuenta el caso de terrenos
  const retrocederPaso = () => {
    setMensaje("");
    setErroresCampos({});
    if (esTerreno && pasoActual === 5) {
      setPasoActual(3);
    } else {
      setPasoActual((pasoActual > 1 ? pasoActual - 1 : 1) as typeof pasoActual);
    }
  };

  const seleccionarParte = (parte: typeof pasoActual) => {
    if (modoEdicion) {
      setPasoActual(parte);
      setMostrarTodoEdicion(false);
      return;
    }
    if (parte <= pasoActual) {
      setMensaje("");
      setErroresCampos({});
      setPasoActual(parte);
      return;
    }
    for (let p = 1; p < parte; p++) {
      if (esTerreno && p === 4) continue;
      if (!validarPaso(p)) {
        setPasoActual(p as typeof pasoActual);
        return;
      }
    }
    setMensaje("");
    setErroresCampos({});
    setPasoActual(parte);
  };

  const mostrarParte = (parte: typeof pasoActual) =>
    pasoActual === parte || (modoEdicion && mostrarTodoEdicion);

  const pasoCompletado = (paso: number) => {
    if (esTerreno && paso === 4) return true;
    return pasosCompletados.includes(paso) && validarDetallePaso(paso).valid;
  };
  const puedeSeleccionarPaso = (paso: number) => {
    if (modoEdicion) return true;
    if (paso <= pasoActual) return true;
    for (let p = 1; p < paso; p++) {
      if (esTerreno && p === 4) continue;
      if (!validarDetallePaso(p).valid) return false;
    }
    return true;
  };

  // Datos auxiliares para la conversión entre monedas
  const precioUSD = Number(formData.precioUSD);
  const precioARS = Number(formData.precioARS);
  const valorReferencialARS = cotizacionBlue && Number.isFinite(precioUSD) && precioUSD > 0
    ? precioUSD * cotizacionBlue
    : null;
  const valorReferencialUSD = cotizacionBlue && Number.isFinite(precioARS) && precioARS > 0
    ? precioARS / cotizacionBlue
    : null;
  const fechaCotizacionFormateada = fechaCotizacionBlue && !Number.isNaN(Date.parse(fechaCotizacionBlue))
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(fechaCotizacionBlue))
    : null;

  const publicarPropiedad = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let p = 1; p <= 7; p++) {
      if (esTerreno && p === 4) continue;
      if (!validarPaso(p)) {
        if (!modoEdicion) {
          setPasoActual(p as typeof pasoActual);
        }
        return;
      }
    }
    setGuardando(true);
    try {
      const propertyId = new URLSearchParams(window.location.search).get("editar");
      const numericFields = [
        ["precio", formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD],
        ["cotización del dólar", formData.cotizacionDolar],
        ["monto de expensas", formData.montoExpensas],
        ["superficie total", formData.superficieTotal],
        ...(esTerreno ? [] : [["cantidad de ambientes", formData.cantidadAmbientes]]),
        ...(esVivienda ? [["dormitorios", formData.dormitorios], ["baños", formData.banos]] : []),
        ...(formData.categoriaOperacion === "temporario" && permiteAlquilerTemporario
          ? [
            ["precio por noche", formData.precioPorNocheUSD],
            ["mínimo de noches", formData.minimoNoches],
            ["huéspedes máximos", formData.huespedesMaximos],
            ["costo de limpieza", formData.costoLimpiezaUSD],
          ]
          : []),
        ["duración del alquiler", formData.duracionAlquilerMeses],
      ] as const;

      const invalidField = numericFields.find(([, value]) => value !== "" && Number(value) < 0);
      if (invalidField) {
        setMensaje(`El campo ${invalidField[0]} no puede tener un valor negativo`);
        return;
      }

      const cotizacionDolar = Number(formData.cotizacionDolar) || 1370;
      const precioIngresado = Number(formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD);
      const precioUSD = formData.moneda === "ARS"
        ? precioIngresado / cotizacionDolar
        : precioIngresado;
      const precioARS = formData.moneda === "ARS"
        ? precioIngresado
        : precioIngresado * cotizacionDolar;
      const operacionPrincipal = operacionSolicitable(formData.categoriaOperacion);
      const operacionesSolicitud: OperacionSolicitud[] = formData.categoriaOperacion === "temporario"
        ? []
        : formData.operacionesSolicitud.length
          ? formData.operacionesSolicitud
          : operacionPrincipal ? [operacionPrincipal] : [];

      // Armar el objeto con el formato que espera la API
      const propertyData = {
        title: formData.titulo,
        codigoInterno: formData.codigoInterno,
        description: formData.descripcion,
        price: Number(precioUSD.toFixed(2)),
        moneda: formData.moneda as "USD" | "ARS",
        priceARS: Number(precioARS.toFixed(2)),
        cotizacionDolar,
        location: formData.direccionCompleta || `${formData.ciudadZonaBarrio}, Entre Ríos`,
        ciudad: formData.ciudadZonaBarrio,
        provincia: formData.provincia,
        direccionCompleta: formData.direccionCompleta,
        referenciasUbicacion: formData.referenciasUbicacion,
        categoria_operacion: formData.categoriaOperacion as "venta" | "alquiler" | "temporario",
        tipo_inmueble: formData.tipoInmueble as "departamento" | "local" | "casa" | "terreno",
        cantidad_ambientes: Number(formData.cantidadAmbientes),
        comodidades: esTerreno ? [] : comodidadesSeleccionadas,
        otrasComodidades: esTerreno ? "" : formData.otrasComodidades,
        expensas: formData.expensas,
        montoExpensas: Number(formData.montoExpensas) || 0,
        estado: modoEdicion ? estadoPropiedad : ("disponible" as const),
        bedrooms: Number(formData.dormitorios),
        bathrooms: Number(formData.banos),
        area: Number(formData.superficieTotal),
        cochera: formData.cochera,
        pisoUnidad: formData.pisoUnidad,
        linkGoogleMaps: formData.linkGoogleMaps,
        latitud: formData.latitud,
        longitud: formData.longitud,
        permitirVisita: formData.permitirVisita,
        permitirWhatsApp: formData.permitirWhatsApp,
        permitirEmail: formData.permitirEmail,
        permitirSolicitudes: formData.permitirSolicitudes,
        operacionesSolicitud,
        horarioAtencion: formData.horarioAtencion,
        telefonoWhatsApp: formData.telefonoWhatsApp,
        precioPorNocheUSD: Number(formData.precioPorNocheUSD) || 0,
        minimoNoches: Number(formData.minimoNoches) || 0,
        huespedesMaximos: Number(formData.huespedesMaximos) || 0,
        costoLimpiezaUSD: Number(formData.costoLimpiezaUSD) || 0,
        duracionAlquilerMeses: (Number(formData.duracionAlquilerMeses) || 0) * (formData.unidadDuracionAlquiler === "años" ? 12 : 1),
        unidadDuracionAlquiler: formData.unidadDuracionAlquiler as "meses" | "años",
        checkInDesde: formData.checkInDesde,
        checkOutHasta: formData.checkOutHasta,
        checkInFlexible: formData.checkInFlexible,
        images: imagenes,
        descuento: {
          porcentaje: Number(formData.descuentoPorcentaje) || 0,
          hasta: formData.descuentoPorcentaje && formData.descuentoHasta ? formData.descuentoHasta : null,
          motivo: formData.descuentoPorcentaje ? formData.descuentoMotivo.trim().slice(0, 120) : "",
        },
        financiacion: formData.financiacionDisponible
          ? {
              disponible: true,
              anticipoPorcentaje: Number(formData.anticipoPorcentaje) || 0,
              cuotas: Number(formData.cuotas),
              tasa: formData.tasa.trim().slice(0, 60),
              detalle: formData.financiacionDetalle.trim().slice(0, 500),
            }
          : { disponible: false },
      };

      if (propertyId) {
        await updateProperty(propertyId, propertyData);
      } else {
        await createProperty(propertyData);
      }
      router.push("/admin/propiedades");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo publicar la propiedad");
    } finally {
      setGuardando(false);
    }
  };

  const PASOS = [
    { n: 1, titulo: "Información principal", texto: "Tipo, operación y ubicación" },
    { n: 2, titulo: "Precio", texto: "Valor, moneda y expensas" },
    { n: 3, titulo: "Características", texto: "Superficie y distribución" },
    { n: 4, titulo: "Comodidades", texto: "Servicios y equipamiento" },
    { n: 5, titulo: "Descripción y ubicación", texto: "Texto y punto en el mapa" },
    { n: 6, titulo: "Fotos y contacto", texto: "Imágenes y canales" },
    { n: 7, titulo: "Condiciones", texto: "Datos finales de la operación" },
  ].filter((paso) => !(esTerreno && paso.n === 4));

  const error = (campo: string) => erroresCampos[campo] ?? null;
  const conError = (campo: string) => Boolean(erroresCampos[campo]);
  const mensajeEsError = Object.keys(erroresCampos).length > 0 || /^(no |la imagen|el archivo|el campo|debés)/i.test(mensaje);
  const pasoInfo = PASOS.find((p) => p.n === pasoActual);
  const posicion = PASOS.findIndex((p) => p.n === pasoActual) + 1;

  // Estimación honesta del alquiler temporario con los datos cargados
  const noche = Number(formData.precioPorNocheUSD) || 0;
  const noches = Math.max(Number(formData.minimoNoches) || 1, 1);
  const limpieza = Number(formData.costoLimpiezaUSD) || 0;
  const totalEstadia = noche > 0 ? noche * noches + limpieza : 0;

  const radio = (nombre: string, valor: string, actual: string, texto: string, alCambiar: (v: string) => void) => (
    <label key={valor} className={`flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-panel-acento ${actual === valor ? "border-panel-marca bg-panel-marca text-panel-marca-texto" : "border-panel-borde-fuerte bg-panel-superficie text-panel-suave hover:bg-panel-hundido"}`}>
      <input type="radio" name={nombre} value={valor} checked={actual === valor} onChange={(e) => alCambiar(e.target.value)} className="sr-only" />
      {texto}
    </label>
  );

  const casilla = (campo: "permitirVisita" | "permitirWhatsApp" | "permitirEmail" | "permitirSolicitudes", titulo: string, texto: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-panel-borde p-3 transition-colors hover:bg-panel-hundido">
      <input
        type="checkbox"
        checked={formData[campo]}
        onChange={(e) => {
          limpiarErrorCampo("contacto");
          setFormData({ ...formData, [campo]: e.target.checked });
        }}
        className="mt-0.5 h-4 w-4 accent-[var(--p-acento)]"
      />
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-[13px] text-panel-suave">{texto}</span>
      </span>
    </label>
  );

  // Si algo no pasa la validación, se lleva la vista al campo a corregir
  useEffect(() => {
    if (!Object.keys(erroresCampos).length) return;
    const campo = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    campo?.focus({ preventScroll: true });
  }, [erroresCampos]);

  // Al cambiar de paso se vuelve al principio del formulario
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pasoActual]);

  if (modoEdicion === false && cargandoPropiedad) {
    return (
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-10 w-64" />
        <Esqueleto className="h-80 w-full" />
      </div>
    );
  }

  return (
    <>
      <Encabezado
        titulo={modoEdicion ? "Editar propiedad" : "Nueva propiedad"}
        volver={{ href: "/admin/propiedades", texto: "Propiedades" }}
        descripcion={modoEdicion ? formData.titulo || "Actualizá los datos de la publicación." : "Completá los datos en orden. Podés volver a cualquier paso ya hecho."}
        acciones={
          modoEdicion ? (
            <>
              <label className="flex items-center gap-2 text-[13px] text-panel-suave">
                Estado
                <select value={estadoPropiedad} onChange={(e) => setEstadoPropiedad(e.target.value as "disponible" | "reservado" | "alquilado" | "vendido")} className={`${control} w-auto`}>
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservada</option>
                  <option value="alquilado">Alquilada</option>
                  <option value="vendido">Vendida</option>
                </select>
              </label>
              <Boton variante="principal" icono="check" onClick={publicarPropiedad} cargando={guardando}>
                Guardar cambios
              </Boton>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* Pasos (al crear) o índice de secciones (al editar) */}
        <nav aria-label={modoEdicion ? "Secciones" : "Pasos"} className="xl:sticky xl:top-8 xl:self-start">
          {!modoEdicion && (
            <div className="mb-3 flex items-center justify-between text-[13px] text-panel-suave xl:hidden">
              <span>
                Paso {posicion} de {PASOS.length}: <span className="font-medium text-panel-texto">{pasoInfo?.titulo}</span>
              </span>
            </div>
          )}
          <ol className="m-0 flex list-none gap-1 overflow-x-auto p-0 pb-1 xl:flex-col xl:overflow-visible">
            {PASOS.map((paso, i) => {
              const activo = !modoEdicion && pasoActual === paso.n;
              const hecho = !modoEdicion && pasoCompletado(paso.n);
              const habilitado = puedeSeleccionarPaso(paso.n);
              const contenido = (
                <>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${activo ? "bg-panel-marca text-panel-marca-texto" : hecho ? "bg-emerald-600 text-white" : "bg-panel-hundido text-panel-suave ring-1 ring-inset ring-panel-borde"}`}>
                    {hecho && !activo ? <Icono nombre="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block whitespace-nowrap text-[14px] xl:whitespace-normal ${activo ? "font-semibold" : "font-medium"}`}>{paso.titulo}</span>
                    <span className="hidden text-[12.5px] text-panel-tenue xl:block">{paso.texto}</span>
                  </span>
                </>
              );
              return (
                <li key={paso.n} className="shrink-0">
                  {modoEdicion ? (
                    <a href={`#parte-${paso.n}`} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-panel-hundido">
                      {contenido}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => seleccionarParte(paso.n as typeof pasoActual)}
                      disabled={!habilitado}
                      aria-current={activo ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 xl:py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${activo ? "bg-panel-superficie ring-1 ring-panel-borde" : "hover:bg-panel-hundido"}`}
                    >
                      {contenido}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <form
          noValidate
          onSubmit={modoEdicion || pasoActual === 7 ? publicarPropiedad : (e) => { e.preventDefault(); avanzarPaso(); }}
          className="flex min-w-0 flex-col gap-6"
        >
          {mostrarParte(1) && (
            <div id="parte-1" className="scroll-mt-6">
              <Tarjeta titulo="Información principal" descripcion="Lo que se ve primero en la publicación.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo etiqueta="Título de la publicación *" htmlFor="campo-titulo" error={error("titulo")} ayuda="Por ejemplo: Casa con galería y parque en Villa Libertador San Martín" className="sm:col-span-2">
                    <input id="campo-titulo" type="text" value={formData.titulo} aria-invalid={conError("titulo")} onChange={(e) => { limpiarErrorCampo("titulo"); setFormData({ ...formData, titulo: e.target.value }); }} className={control} />
                  </Campo>
                  <Campo etiqueta="Código interno" htmlFor="campo-codigo" ayuda="Opcional, para identificarla en la oficina.">
                    <input id="campo-codigo" type="text" value={formData.codigoInterno} onChange={(e) => setFormData({ ...formData, codigoInterno: e.target.value })} placeholder="Ej.: VLSM-012" className={control} />
                  </Campo>
                  <Campo etiqueta="Tipo de inmueble *" htmlFor="campo-tipo" error={error("tipoInmueble")}>
                    <select
                      id="campo-tipo"
                      value={formData.tipoInmueble}
                      aria-invalid={conError("tipoInmueble")}
                      onChange={(e) => {
                        limpiarErrorCampo("tipoInmueble");
                        const tipoInmueble = e.target.value;
                        setFormData({
                          ...formData,
                          tipoInmueble,
                          categoriaOperacion: tipoInmueble === "casa" || tipoInmueble === "departamento"
                            ? formData.categoriaOperacion
                            : formData.categoriaOperacion === "temporario" ? "venta" : formData.categoriaOperacion,
                        });
                      }}
                      className={control}
                    >
                      <option value="">Elegí un tipo</option>
                      <option value="departamento">Departamento</option>
                      <option value="casa">Casa</option>
                      <option value="local">Local comercial</option>
                      <option value="terreno">Terreno</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Operación *" htmlFor="campo-operacion" error={error("categoriaOperacion")} ayuda={!permiteAlquilerTemporario && formData.tipoInmueble ? "El alquiler por días es solo para casas y departamentos." : undefined}>
                    <select id="campo-operacion" value={formData.categoriaOperacion} aria-invalid={conError("categoriaOperacion")} onChange={(e) => { limpiarErrorCampo("categoriaOperacion"); setFormData({ ...formData, categoriaOperacion: e.target.value }); }} className={control}>
                      <option value="">Elegí una operación</option>
                      <option value="venta">Venta</option>
                      <option value="alquiler">Alquiler</option>
                      {permiteAlquilerTemporario && <option value="temporario">Alquiler por días</option>}
                    </select>
                  </Campo>
                  <Campo etiqueta="Localidad *" htmlFor="campo-localidad" error={error("ciudadZonaBarrio")} ayuda="Provincia de Entre Ríos.">
                    <select id="campo-localidad" value={formData.ciudadZonaBarrio} aria-invalid={conError("ciudadZonaBarrio")} onChange={(e) => { limpiarErrorCampo("ciudadZonaBarrio"); actualizarUbicacionTexto("ciudadZonaBarrio", e.target.value); }} className={control}>
                      <option value="">Elegí la localidad</option>
                      {formData.ciudadZonaBarrio && !localidades.includes(formData.ciudadZonaBarrio) && <option value={formData.ciudadZonaBarrio}>{formData.ciudadZonaBarrio}</option>}
                      {localidades.map((localidad) => (
                        <option key={localidad} value={localidad}>{localidad}</option>
                      ))}
                    </select>
                  </Campo>
                  <Campo etiqueta="Dirección *" htmlFor="campo-direccion" error={error("direccionCompleta")}>
                    <input id="campo-direccion" type="text" value={formData.direccionCompleta} aria-invalid={conError("direccionCompleta")} onChange={(e) => { limpiarErrorCampo("direccionCompleta"); actualizarUbicacionTexto("direccionCompleta", e.target.value); }} placeholder="Ej.: 25 de Mayo 726" className={control} />
                  </Campo>
                  <Campo etiqueta="Referencias" htmlFor="campo-referencias" ayuda="Opcional: entre qué calles, cerca de qué." className="sm:col-span-2">
                    <input id="campo-referencias" type="text" value={formData.referenciasUbicacion} onChange={(e) => setFormData({ ...formData, referenciasUbicacion: e.target.value })} placeholder="Ej.: Frente a la plaza, a dos cuadras de la universidad" className={control} />
                  </Campo>
                </div>
              </Tarjeta>
            </div>
          )}

          {mostrarParte(2) && (
            <div id="parte-2" className="scroll-mt-6">
              <Tarjeta titulo="Precio" descripcion="Se guarda en la moneda que elijas y se muestra la referencia en la otra con el dólar blue.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo etiqueta="Moneda" htmlFor="campo-moneda">
                    <select id="campo-moneda" value={formData.moneda} onChange={(e) => setFormData({ ...formData, moneda: e.target.value })} className={control}>
                      <option value="USD">Dólares (USD)</option>
                      <option value="ARS">Pesos (ARS)</option>
                    </select>
                  </Campo>
                  <Campo etiqueta={`${formData.categoriaOperacion === "alquiler" ? "Precio mensual" : "Precio"} en ${formData.moneda} *`} htmlFor="campo-precio" error={error("precio")}>
                    <input
                      id="campo-precio"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder={formData.moneda === "ARS" ? "Ej.: 98640000" : "Ej.: 72000"}
                      value={formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD}
                      aria-invalid={conError("precio")}
                      onChange={(e) => { limpiarErrorCampo("precio"); handleNonNegativeNumberChange(formData.moneda === "ARS" ? "precioARS" : "precioUSD", e.target.value); }}
                      className={`${control} tabular`}
                    />
                  </Campo>
                  <div className="sm:col-span-2">
                    {estadoCotizacionBlue === "disponible" && cotizacionBlue ? (
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-lg bg-panel-hundido px-4 py-3 text-[13.5px]">
                        <span className="text-panel-suave">
                          Dólar blue: <span className="tabular font-medium text-panel-texto">${cotizacionBlue.toLocaleString("es-AR")}</span>
                          {fechaCotizacionFormateada && <span className="text-panel-tenue"> · actualizado {fechaCotizacionFormateada}</span>}
                        </span>
                        {formData.moneda === "USD" && valorReferencialARS !== null && (
                          <span className="tabular font-medium">≈ ARS {valorReferencialARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                        )}
                        {formData.moneda === "ARS" && valorReferencialUSD !== null && (
                          <span className="tabular font-medium">≈ USD {valorReferencialUSD.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                        )}
                      </div>
                    ) : (
                      <p className="m-0 rounded-lg bg-panel-hundido px-4 py-3 text-[13.5px] text-panel-suave">
                        {estadoCotizacionBlue === "error" ? "La cotización del blue no está disponible ahora. Podés escribirla a mano abajo." : "Consultando la cotización del dólar blue…"}
                      </p>
                    )}
                  </div>
                  <Campo etiqueta="Cotización del dólar usada" htmlFor="campo-cotizacion" error={error("cotizacionDolar")} ayuda={cotizacionBlue !== null ? "Se toma sola del dólar blue." : "Escribila si no se pudo consultar."}>
                    <input
                      id="campo-cotizacion"
                      type="number"
                      min="0"
                      value={cotizacionBlue ?? formData.cotizacionDolar}
                      readOnly={cotizacionBlue !== null}
                      onChange={(e) => { if (cotizacionBlue === null) handleNonNegativeNumberChange("cotizacionDolar", e.target.value); }}
                      className={`${control} tabular read-only:bg-panel-hundido read-only:text-panel-suave`}
                    />
                  </Campo>
                  <div className="hidden sm:block" />
                  <Campo etiqueta="Expensas" htmlFor="campo-expensas">
                    <select id="campo-expensas" value={formData.expensas} onChange={(e) => setFormData({ ...formData, expensas: e.target.value })} className={control}>
                      <option value="">Sin indicar</option>
                      <option value="no_incluye">No incluye expensas</option>
                      <option value="incluye">Incluye expensas</option>
                      <option value="sin_expensas">No tiene expensas</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Monto de expensas (ARS)" htmlFor="campo-monto-expensas" error={error("montoExpensas")}>
                    <input id="campo-monto-expensas" type="number" min="0" value={formData.montoExpensas} disabled={formData.expensas === "sin_expensas"} onChange={(e) => handleNonNegativeNumberChange("montoExpensas", e.target.value)} placeholder="Ej.: 45000" className={`${control} tabular`} />
                  </Campo>
                </div>
              </Tarjeta>
              {formData.categoriaOperacion !== "temporario" && (
                <div className="mt-6">
                  <Tarjeta titulo="Descuento y financiación" descripcion="Opcional. El descuento se muestra con el precio anterior tachado; la financiación, debajo del precio.">
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Campo etiqueta="Descuento (%)" htmlFor="campo-descuento" error={error("descuentoPorcentaje")} ayuda="Vacío: sin descuento.">
                        <input id="campo-descuento" type="number" min="0" max="90" inputMode="decimal" value={formData.descuentoPorcentaje} aria-invalid={conError("descuentoPorcentaje")} onChange={(e) => { limpiarErrorCampo("descuentoPorcentaje"); handleNonNegativeNumberChange("descuentoPorcentaje", e.target.value); }} placeholder="Ej.: 10" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Vale hasta" htmlFor="campo-descuento-hasta" ayuda="Vacío: hasta que lo saques.">
                        <input id="campo-descuento-hasta" type="date" value={formData.descuentoHasta} disabled={!formData.descuentoPorcentaje} onChange={(e) => setFormData({ ...formData, descuentoHasta: e.target.value })} className={control} />
                      </Campo>
                      <Campo etiqueta="Motivo (se muestra)" htmlFor="campo-descuento-motivo">
                        <input id="campo-descuento-motivo" type="text" maxLength={120} value={formData.descuentoMotivo} disabled={!formData.descuentoPorcentaje} onChange={(e) => setFormData({ ...formData, descuentoMotivo: e.target.value })} placeholder="Ej.: Precio especial pago contado" className={control} />
                      </Campo>
                    </div>
                    <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-panel-borde p-3 transition-colors hover:bg-panel-hundido">
                      <input type="checkbox" checked={formData.financiacionDisponible} onChange={(e) => { limpiarErrorCampo("cuotas"); setFormData({ ...formData, financiacionDisponible: e.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[var(--p-acento)]" />
                      <span>
                        <span className="block text-sm font-medium">Ofrece financiación</span>
                        <span className="block text-[13px] text-panel-suave">Por ejemplo, anticipo y cuotas directas con el dueño.</span>
                      </span>
                    </label>
                    {formData.financiacionDisponible && (
                      <div className="mt-5 grid gap-5 sm:grid-cols-3">
                        <Campo etiqueta="Anticipo (%)" htmlFor="campo-anticipo" error={error("anticipoPorcentaje")}>
                          <input id="campo-anticipo" type="number" min="0" max="100" value={formData.anticipoPorcentaje} onChange={(e) => handleNonNegativeNumberChange("anticipoPorcentaje", e.target.value)} placeholder="Ej.: 40" className={`${control} tabular`} />
                        </Campo>
                        <Campo etiqueta="Cuotas *" htmlFor="campo-cuotas" error={error("cuotas")}>
                          <input id="campo-cuotas" type="number" min="1" max="360" step="1" value={formData.cuotas} aria-invalid={conError("cuotas")} onChange={(e) => { limpiarErrorCampo("cuotas"); handleNonNegativeNumberChange("cuotas", e.target.value); }} placeholder="Ej.: 24" className={`${control} tabular`} />
                        </Campo>
                        <Campo etiqueta="Interés" htmlFor="campo-tasa">
                          <input id="campo-tasa" type="text" maxLength={60} value={formData.tasa} onChange={(e) => setFormData({ ...formData, tasa: e.target.value })} placeholder="Ej.: Sin interés, en dólares" className={control} />
                        </Campo>
                        <div className="sm:col-span-3">
                          <Campo etiqueta="Detalle" htmlFor="campo-financiacion-detalle" ayuda={`${formData.financiacionDetalle.length} de 500 caracteres`}>
                            <textarea id="campo-financiacion-detalle" rows={3} maxLength={500} value={formData.financiacionDetalle} onChange={(e) => setFormData({ ...formData, financiacionDetalle: e.target.value })} placeholder="Ej.: Cuotas fijas en dólares; se firma boleto con el anticipo." className={areaTexto} />
                          </Campo>
                        </div>
                      </div>
                    )}
                  </Tarjeta>
                </div>
              )}
            </div>
          )}

          {mostrarParte(3) && (
            <div id="parte-3" className="scroll-mt-6">
              <Tarjeta titulo="Características" descripcion={esTerreno ? "Para terrenos alcanza con la superficie." : "Superficie y distribución de la propiedad."}>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Campo etiqueta="Superficie total (m²) *" htmlFor="campo-superficie" error={error("superficieTotal")}>
                    <input id="campo-superficie" type="number" min="0" value={formData.superficieTotal} aria-invalid={conError("superficieTotal")} onChange={(e) => { limpiarErrorCampo("superficieTotal"); handleNonNegativeNumberChange("superficieTotal", e.target.value); }} className={`${control} tabular`} />
                  </Campo>
                  {!esTerreno && (
                    <Campo etiqueta={`Ambientes${esVivienda ? " *" : ""}`} htmlFor="campo-ambientes" error={error("cantidadAmbientes")}>
                      <input id="campo-ambientes" type="number" min="0" value={formData.cantidadAmbientes} aria-invalid={conError("cantidadAmbientes")} onChange={(e) => { limpiarErrorCampo("cantidadAmbientes"); handleNonNegativeNumberChange("cantidadAmbientes", e.target.value); }} className={`${control} tabular`} />
                    </Campo>
                  )}
                  {esVivienda && (
                    <>
                      <Campo etiqueta="Dormitorios *" htmlFor="campo-dormitorios" error={error("dormitorios")}>
                        <input id="campo-dormitorios" type="number" min="0" value={formData.dormitorios} aria-invalid={conError("dormitorios")} onChange={(e) => { limpiarErrorCampo("dormitorios"); handleNonNegativeNumberChange("dormitorios", e.target.value); }} className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Baños *" htmlFor="campo-banos" error={error("banos")}>
                        <input id="campo-banos" type="number" min="0" value={formData.banos} aria-invalid={conError("banos")} onChange={(e) => { limpiarErrorCampo("banos"); handleNonNegativeNumberChange("banos", e.target.value); }} className={`${control} tabular`} />
                      </Campo>
                    </>
                  )}
                  {!esTerreno && (
                    <>
                      <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-2">
                        <span className="text-[13px] font-medium text-panel-suave">Cochera</span>
                        <div role="radiogroup" aria-label="Cochera" className="flex gap-2">
                          {radio("cochera", "si", formData.cochera, "Tiene", (v) => setFormData({ ...formData, cochera: v }))}
                          {radio("cochera", "no", formData.cochera, "No tiene", (v) => setFormData({ ...formData, cochera: v }))}
                        </div>
                      </div>
                      <Campo etiqueta="Piso y unidad" htmlFor="campo-piso" className="lg:col-span-2">
                        <input id="campo-piso" type="text" value={formData.pisoUnidad} onChange={(e) => setFormData({ ...formData, pisoUnidad: e.target.value })} placeholder="Ej.: Piso 3, unidad A" className={control} />
                      </Campo>
                    </>
                  )}
                </div>
              </Tarjeta>
            </div>
          )}

          {!esTerreno && mostrarParte(4) && (
            <div id="parte-4" className="scroll-mt-6">
              <Tarjeta titulo="Comodidades" descripcion="Marcá lo que tiene. Se muestran en la publicación.">
                <div className="flex flex-wrap gap-2">
                  {comodidadesList.map((item) => {
                    const elegida = comodidadesSeleccionadas.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={elegida}
                        onClick={() => toggleComodidad(item.id)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] transition-colors ${elegida ? "border-panel-marca bg-panel-marca text-panel-marca-texto" : "border-panel-borde-fuerte bg-panel-superficie text-panel-suave hover:bg-panel-hundido hover:text-panel-texto"}`}
                      >
                        {elegida && <Icono nombre="check" className="h-4 w-4" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <Campo etiqueta="Otras comodidades" htmlFor="campo-otras" ayuda="Opcional, separadas por coma." className="mt-5">
                  <input id="campo-otras" type="text" value={formData.otrasComodidades} onChange={(e) => setFormData({ ...formData, otrasComodidades: e.target.value })} placeholder="Ej.: Patio amplio, quincho, lavadero" className={control} />
                </Campo>
              </Tarjeta>
            </div>
          )}

          {mostrarParte(5) && (
            <div id="parte-5" className="flex scroll-mt-6 flex-col gap-6">
              <Tarjeta titulo="Descripción" descripcion="Contá cómo es la propiedad, el entorno y lo que la hace especial.">
                <Campo etiqueta="Descripción" htmlFor="campo-descripcion" error={error("descripcion")} ayuda={`${formData.descripcion.length.toLocaleString("es-AR")} de 3.000 caracteres`}>
                  <textarea id="campo-descripcion" rows={7} maxLength={3000} value={formData.descripcion} aria-invalid={conError("descripcion")} onChange={(e) => { limpiarErrorCampo("descripcion"); setFormData({ ...formData, descripcion: e.target.value }); }} placeholder="Ej.: Casa luminosa de dos dormitorios, con galería al fondo y parque arbolado…" className={areaTexto} />
                </Campo>
              </Tarjeta>
              <Tarjeta titulo="Ubicación en el mapa" descripcion="Pegá el link de Google Maps o marcá el punto en el mapa.">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-5">
                    <Campo etiqueta="Link de Google Maps" htmlFor="campo-maps" ayuda={resolviendoMapa ? "Buscando las coordenadas…" : "Al salir del campo se completan latitud y longitud."}>
                      <input id="campo-maps" type="url" value={formData.linkGoogleMaps} onChange={(e) => actualizarUbicacionTexto("linkGoogleMaps", e.target.value)} onBlur={(e) => completarCoordenadasDesdeLink(e.target.value.trim())} placeholder="Ej.: https://maps.app.goo.gl/…" className={control} />
                    </Campo>
                    <div className="grid grid-cols-2 gap-3">
                      <Campo etiqueta="Latitud" htmlFor="campo-latitud" error={error("latitud")}>
                        <input id="campo-latitud" type="text" inputMode="decimal" value={formData.latitud} aria-invalid={conError("latitud")} onChange={(e) => { limpiarErrorCampo("latitud"); setFormData({ ...formData, latitud: e.target.value }); }} placeholder="Ej.: -32.0712" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Longitud" htmlFor="campo-longitud" error={error("longitud")}>
                        <input id="campo-longitud" type="text" inputMode="decimal" value={formData.longitud} aria-invalid={conError("longitud")} onChange={(e) => { limpiarErrorCampo("longitud"); setFormData({ ...formData, longitud: e.target.value }); }} placeholder="Ej.: -60.4591" className={`${control} tabular`} />
                      </Campo>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <SelectorUbicacionMapa
                      latitud={formData.latitud}
                      longitud={formData.longitud}
                      onChange={(lat, lng) => {
                        setFormData((current) => ({ ...current, latitud: lat, longitud: lng }));
                      }}
                      direccionSugerida={formData.direccionCompleta}
                      ciudadSugerida={formData.ciudadZonaBarrio}
                      provinciaSugerida={formData.provincia}
                    />
                  </div>
                </div>
              </Tarjeta>
            </div>
          )}

          {mostrarParte(6) && (
            <div id="parte-6" className="grid scroll-mt-6 gap-6 2xl:grid-cols-2">
              <Tarjeta titulo="Fotos" descripcion={`${imagenes.length} de 20 · La primera es la portada.`}>
                <label
                  onDragEnter={(e) => { e.preventDefault(); setArrastrandoImagenes(true); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => { e.preventDefault(); setArrastrandoImagenes(false); }}
                  onDrop={handleSoltarImagenes}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-panel-acento ${arrastrandoImagenes ? "border-panel-acento bg-panel-acento-suave" : "border-panel-borde-fuerte hover:bg-panel-hundido"}`}
                >
                  <input type="file" multiple accept="image/*" onChange={handleSubirImagenes} className="sr-only" />
                  <Icono nombre="subir" className="h-6 w-6 text-panel-suave" />
                  <span className="text-sm font-medium">{arrastrandoImagenes ? "Soltá las fotos acá" : "Arrastrá las fotos o hacé clic para elegirlas"}</span>
                  <span className="text-[12.5px] text-panel-tenue">JPG, PNG o WEBP · hasta 10 MB cada una</span>
                </label>
                {error("imagenes") && <p className="m-0 mt-2 text-[12.5px] text-red-600 dark:text-red-400">{error("imagenes")}</p>}
                {imagenes.length > 0 && (
                  <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
                    {imagenes.map((imgUrl, index) => (
                      <li key={`${imgUrl}-${index}`} className="group relative overflow-hidden rounded-lg border border-panel-borde">
                        {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas por el admin */}
                        <img src={imgUrl} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                        {index === 0 && <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-0.5 text-[11.5px] font-medium text-white">Portada</span>}
                        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          {index > 0 && (
                            <button type="button" onClick={() => hacerPortada(index)} title="Usar como portada" aria-label={`Usar la foto ${index + 1} como portada`} className="rounded-md bg-white/90 p-1.5 text-slate-800 hover:bg-white">
                              <Icono nombre="estrella" className="h-4 w-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => eliminarImagen(index)} title="Quitar foto" aria-label={`Quitar la foto ${index + 1}`} className="rounded-md bg-white/90 p-1.5 text-red-700 hover:bg-white">
                            <Icono nombre="borrar" className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
              <Tarjeta titulo="Contacto en la publicación" descripcion="Qué opciones ve el cliente en la página de la propiedad.">
                <div className="flex flex-col gap-2">
                  {casilla("permitirVisita", "Agendar una visita", "El cliente pide día y horario desde la publicación.")}
                  {casilla("permitirWhatsApp", "WhatsApp", "Botón para escribir con el mensaje listo.")}
                  {casilla("permitirEmail", "Email", "Enlace para mandar una consulta por correo.")}
                  {formData.categoriaOperacion !== "temporario" && (
                    <>
                      {casilla("permitirSolicitudes", "Recibir solicitudes", "Habilita solicitudes formales de compra o alquiler.")}
                      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 pl-7">
                        <legend className="text-[13px] font-medium text-panel-suave">Operaciones disponibles para solicitar</legend>
                        {(["venta", "alquiler"] as const).map((operacion) => {
                          const principal = operacionSolicitable(formData.categoriaOperacion);
                          const seleccionadas = formData.operacionesSolicitud.length
                            ? formData.operacionesSolicitud
                            : principal
                              ? [principal]
                              : [];
                          const marcada = seleccionadas.includes(operacion);
                          return (
                            <label key={operacion} className="flex cursor-pointer items-center gap-2 text-[13px] text-panel-texto">
                              <input
                                type="checkbox"
                                checked={marcada}
                                onChange={(e) => setFormData((actual) => {
                                  const categoriaPrincipal = operacionSolicitable(actual.categoriaOperacion);
                                  const base = actual.operacionesSolicitud.length
                                    ? actual.operacionesSolicitud
                                    : categoriaPrincipal
                                      ? [categoriaPrincipal]
                                      : [];
                                  return {
                                    ...actual,
                                    operacionesSolicitud: e.target.checked
                                      ? [...base, operacion]
                                      : base.filter((item) => item !== operacion),
                                  };
                                })}
                                className="h-4 w-4 accent-[var(--p-acento)]"
                              />
                              Solicitar {operacion === "venta" ? "compra" : "alquiler"}
                            </label>
                          );
                        })}
                      </fieldset>
                    </>
                  )}
                  {error("contacto") && <p className="m-0 text-[12.5px] text-red-600 dark:text-red-400">{error("contacto")}</p>}
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Campo etiqueta="Horario de atención" htmlFor="campo-horario">
                    <select id="campo-horario" value={formData.horarioAtencion} onChange={(e) => setFormData({ ...formData, horarioAtencion: e.target.value })} className={control}>
                      <option value="">Sin indicar</option>
                      <option value="Lun a Vie 9 - 18 h • Sáb 9 - 13 h">Lun a Vie 9 - 18 h • Sáb 9 - 13 h</option>
                      <option value="Lun a Vie 8 - 17 h">Lun a Vie 8 - 17 h</option>
                      <option value="Todos los días 9 - 20 h">Todos los días 9 - 20 h</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="WhatsApp de esta propiedad" htmlFor="campo-whatsapp" ayuda="Vacío = el de la oficina.">
                    <input id="campo-whatsapp" type="tel" value={formData.telefonoWhatsApp} onChange={(e) => setFormData({ ...formData, telefonoWhatsApp: e.target.value })} placeholder="Ej.: +54 9 343 446 9522" className={control} />
                  </Campo>
                </div>
              </Tarjeta>
            </div>
          )}

          {mostrarParte(7) && (
            <div id="parte-7" className="scroll-mt-6">
              {formData.categoriaOperacion === "temporario" && permiteAlquilerTemporario ? (
                <Tarjeta titulo="Alquiler por días" descripcion="Precio por noche y reglas de la estadía.">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Campo etiqueta="Precio por noche (USD) *" htmlFor="campo-noche" error={error("precioPorNocheUSD")}>
                        <input id="campo-noche" type="number" min="0" value={formData.precioPorNocheUSD} aria-invalid={conError("precioPorNocheUSD")} onChange={(e) => { limpiarErrorCampo("precioPorNocheUSD"); handleNonNegativeNumberChange("precioPorNocheUSD", e.target.value); }} placeholder="Ej.: 85" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Mínimo de noches *" htmlFor="campo-minimo" error={error("minimoNoches")}>
                        <input id="campo-minimo" type="number" min="1" value={formData.minimoNoches} aria-invalid={conError("minimoNoches")} onChange={(e) => { limpiarErrorCampo("minimoNoches"); handleNonNegativeNumberChange("minimoNoches", e.target.value); }} placeholder="Ej.: 2" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Huéspedes como máximo *" htmlFor="campo-huespedes" error={error("huespedesMaximos")}>
                        <input id="campo-huespedes" type="number" min="1" value={formData.huespedesMaximos} aria-invalid={conError("huespedesMaximos")} onChange={(e) => { limpiarErrorCampo("huespedesMaximos"); handleNonNegativeNumberChange("huespedesMaximos", e.target.value); }} placeholder="Ej.: 4" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Limpieza (USD)" htmlFor="campo-limpieza" error={error("costoLimpiezaUSD")} ayuda="Opcional, se cobra una vez.">
                        <input id="campo-limpieza" type="number" min="0" value={formData.costoLimpiezaUSD} onChange={(e) => handleNonNegativeNumberChange("costoLimpiezaUSD", e.target.value)} placeholder="Ej.: 25" className={`${control} tabular`} />
                      </Campo>
                      <Campo etiqueta="Check-in desde" htmlFor="campo-checkin">
                        <input id="campo-checkin" type="text" value={formData.checkInDesde} onChange={(e) => setFormData({ ...formData, checkInDesde: e.target.value })} placeholder="Ej.: 14:00" className={control} />
                      </Campo>
                      <Campo etiqueta="Check-out hasta" htmlFor="campo-checkout">
                        <input id="campo-checkout" type="text" value={formData.checkOutHasta} onChange={(e) => setFormData({ ...formData, checkOutHasta: e.target.value })} placeholder="Ej.: 10:00" className={control} />
                      </Campo>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <span className="text-[13px] font-medium text-panel-suave">Horario de entrada flexible</span>
                        <div role="radiogroup" aria-label="Horario de entrada flexible" className="flex max-w-xs gap-2">
                          {radio("checkInFlexible", "si", formData.checkInFlexible, "Sí", (v) => setFormData({ ...formData, checkInFlexible: v }))}
                          {radio("checkInFlexible", "no", formData.checkInFlexible, "No", (v) => setFormData({ ...formData, checkInFlexible: v }))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 self-start rounded-lg bg-panel-hundido p-4 text-[13.5px]">
                      <span className="text-panel-suave">Estadía mínima</span>
                      {totalEstadia > 0 ? (
                        <>
                          <span className="tabular text-[22px] font-semibold leading-tight">USD {totalEstadia.toLocaleString("es-AR")}</span>
                          <span className="text-panel-suave">
                            {noches} {noches === 1 ? "noche" : "noches"} × USD {noche.toLocaleString("es-AR")}
                            {limpieza > 0 ? ` + limpieza USD ${limpieza.toLocaleString("es-AR")}` : ""}
                          </span>
                          {cotizacionBlue && <span className="tabular text-panel-tenue">≈ ARS {(totalEstadia * cotizacionBlue).toLocaleString("es-AR", { maximumFractionDigits: 0 })} con el blue</span>}
                        </>
                      ) : (
                        <span className="text-panel-tenue">Cargá el precio por noche para ver el total.</span>
                      )}
                    </div>
                  </div>
                </Tarjeta>
              ) : (
                <Tarjeta titulo={formData.categoriaOperacion === "venta" ? "Condiciones de venta" : "Condiciones de alquiler"} descripcion="Revisá el resumen antes de publicar.">
                  <dl className="m-0 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-panel-hundido px-4 py-3">
                      <dt className="text-[13px] text-panel-suave">{formData.categoriaOperacion === "venta" ? "Precio de venta" : "Precio mensual"}</dt>
                      <dd className="tabular m-0 mt-0.5 text-[17px] font-semibold">
                        {formData.moneda} {Number((formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD) || 0).toLocaleString("es-AR")}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-panel-hundido px-4 py-3">
                      <dt className="text-[13px] text-panel-suave">Expensas</dt>
                      <dd className="tabular m-0 mt-0.5 text-[17px] font-semibold">
                        {formData.expensas === "sin_expensas" ? "No tiene" : formData.montoExpensas ? `ARS ${Number(formData.montoExpensas).toLocaleString("es-AR")}` : "Sin indicar"}
                      </dd>
                    </div>
                  </dl>
                  {formData.categoriaOperacion === "alquiler" && (
                    <Campo etiqueta="Duración del contrato" htmlFor="campo-duracion" error={error("duracionAlquilerMeses")} ayuda="En meses, hasta 11; para más, elegí años." className="mt-5 max-w-sm">
                      <div className="flex gap-2">
                        <input
                          id="campo-duracion"
                          type="number"
                          min="1"
                          max={formData.unidadDuracionAlquiler === "meses" ? "11" : undefined}
                          placeholder={formData.unidadDuracionAlquiler === "meses" ? "Ej.: 6" : "Ej.: 2"}
                          value={formData.duracionAlquilerMeses}
                          onChange={(e) => {
                            limpiarErrorCampo("duracionAlquilerMeses");
                            const maxMeses = formData.unidadDuracionAlquiler === "meses" ? 11 : Number.MAX_SAFE_INTEGER;
                            if (e.target.value === "" || (Number(e.target.value) >= 0 && Number(e.target.value) <= maxMeses)) {
                              setFormData({ ...formData, duracionAlquilerMeses: e.target.value });
                            }
                          }}
                          className={`${control} tabular`}
                        />
                        <select
                          aria-label="Unidad de la duración"
                          value={formData.unidadDuracionAlquiler}
                          onChange={(e) => {
                            const unidad = e.target.value;
                            setFormData({
                              ...formData,
                              unidadDuracionAlquiler: unidad,
                              duracionAlquilerMeses: unidad === "meses" && Number(formData.duracionAlquilerMeses) > 11 ? "11" : formData.duracionAlquilerMeses,
                            });
                          }}
                          className={`${control} w-32`}
                        >
                          <option value="meses">Meses</option>
                          <option value="años">Años</option>
                        </select>
                      </div>
                    </Campo>
                  )}
                </Tarjeta>
              )}
            </div>
          )}

          {/* Barra de acciones */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-panel-borde bg-panel-fondo/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:-mx-10 lg:px-10">
            <div className="flex gap-2">
              {modoEdicion ? (
                <BotonLink href="/admin/propiedades" variante="fantasma" icono="atras">
                  Volver al listado
                </BotonLink>
              ) : pasoActual > 1 ? (
                <Boton variante="fantasma" icono="atras" onClick={retrocederPaso}>
                  Paso anterior
                </Boton>
              ) : (
                <BotonLink href="/admin/propiedades" variante="fantasma" icono="atras">
                  Cancelar
                </BotonLink>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {mensaje && (
                <p role={mensajeEsError ? "alert" : "status"} className={`m-0 text-[13.5px] ${mensajeEsError ? "text-red-600 dark:text-red-400" : "text-panel-suave"}`}>
                  {mensaje}
                </p>
              )}
              <Boton type="submit" variante="principal" cargando={guardando} icono={modoEdicion || pasoActual === 7 ? "check" : undefined}>
                {modoEdicion ? "Guardar cambios" : pasoActual === 7 ? "Publicar propiedad" : "Siguiente"}
                {!modoEdicion && pasoActual !== 7 && <Icono nombre="flecha" className="h-[18px] w-[18px]" />}
              </Boton>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
