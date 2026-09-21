"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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

export default function NuevaPropiedadPage() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  // Control de paso (1 o 2)
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
  });

  const [comodidadesSeleccionadas, setComodidadesSeleccionadas] = useState<string[]>([]);

  // Lista de imágenes de ejemplo para el diseño de referencia
  const [imagenes, setImagenes] = useState<string[]>([]);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoPropiedad, setEstadoPropiedad] = useState<"disponible" | "reservado" | "alquilado" | "vendido">("disponible");
  const [mostrarTodoEdicion, setMostrarTodoEdicion] = useState(true);
  const [cargandoPropiedad, setCargandoPropiedad] = useState(false);
  const [arrastrandoImagenes, setArrastrandoImagenes] = useState(false);
  const [resolviendoMapa, setResolviendoMapa] = useState(false);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});
  const [cotizacionBlue, setCotizacionBlue] = useState<number | null>(null);
  const [fechaCotizacionBlue, setFechaCotizacionBlue] = useState<string | null>(null);
  const [estadoCotizacionBlue, setEstadoCotizacionBlue] = useState<"inicial" | "cargando" | "disponible" | "error">("inicial");

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

  const toggleComodidad = (item: string) => {
    setComodidadesSeleccionadas((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

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
      const oversizedFile = filesArray.find((file) => file.size > 20 * 1024 * 1024);

      if (oversizedFile) {
        setMensaje(`La imagen "${oversizedFile.name}" supera el límite de 20 MB`);
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
      if (!formData.permitirVisita && !formData.permitirWhatsApp && !formData.permitirEmail) {
        return { valid: false, error: "Debés habilitar al menos una opción de contacto (visita, WhatsApp o email)", field: "contacto" };
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
    const pasosActualizados = esTerreno && pasoActual === 3
      ? [pasoActual, 4]
      : [pasoActual];
    setPasosCompletados((current) => [...new Set([...current, ...pasosActualizados])]);
    const siguientePaso = esTerreno && pasoActual === 3 ? 5 : pasoActual < 7 ? pasoActual + 1 : 7;
    setPasoActual(siguientePaso as typeof pasoActual);
    setMensaje("");
    setErroresCampos({});
  };

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
  const numeroVisiblePaso = (paso: number) => esTerreno && paso >= 5 ? paso - 1 : paso;

  const mapQuery = formData.latitud && formData.longitud
    ? `${formData.latitud},${formData.longitud}`
    : formData.linkGoogleMaps || formData.direccionCompleta || `${formData.ciudadZonaBarrio}, Entre Ríos`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
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
      };

      if (propertyId) {
        await updateProperty(propertyId, propertyData);
      } else {
        await createProperty(propertyData);
      }
      router.push("/admin/propiedades");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo publicar la propiedad");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* Sidebar - Panel Admin */}
      <aside className="w-64 bg-[#0A193D] text-white flex flex-col shrink-0 border-r border-[#152e69]">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Panel Admin
          </h2>
        </div>

        <nav className="flex-1 px-3 space-y-1.5">
          <Link
            href="/admin/propiedades"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#193B7B] text-white font-medium text-sm transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Propiedades
          </Link>

          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Visitas
          </button>

          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Contratos
          </button>

          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Clientes
          </button>

          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Solicitudes
          </button>

          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </button>
        </nav>

        <div className="px-3 pb-5 space-y-1.5 border-t border-[#152e69] pt-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors"
          >
            Ver sitio
          </Link>
          <Link
            href="/propiedades"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-[#122756] hover:text-white text-sm font-medium transition-colors"
          >
            Catálogo público
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0A193D] tracking-tight">
              {modoEdicion ? "Editar propiedad" : "Nueva propiedad"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {modoEdicion ? "Actualizá los datos de la propiedad" : "Completá los datos para publicar un inmueble"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {modoEdicion ? "Edición completa" : `Parte ${numeroVisiblePaso(pasoActual)} de ${esTerreno ? 6 : 7}`}
            </div>
          </div>
        </div>

        {!modoEdicion && <div className="bg-white border border-slate-200/90 rounded-xl p-5 mb-6 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 relative">
            {/* Paso 1 */}
            <div
              onClick={() => seleccionarParte(1)}
              className={`flex items-start gap-2 relative pb-3 cursor-pointer transition-opacity ${pasoActual === 1 ? "opacity-100" : "opacity-60"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${pasoCompletado(1) || pasoActual === 1 ? "bg-[#6798dc] text-white" : "bg-slate-100 border border-slate-300 text-slate-600"}`}
              >
                {pasoCompletado(1) ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0A193D]">
                  1. Básicos
                </h3>
                <p className="hidden md:block text-[10px] text-slate-500 mt-0.5">
                  Identidad y ubicación
                </p>
              </div>
              {pasoActual === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />
              )}
            </div>

            {/* Paso 2 */}
            <div
              onClick={() => puedeSeleccionarPaso(2) && seleccionarParte(2)}
              className={`flex items-start gap-2 relative pb-3 cursor-pointer transition-opacity ${pasoActual === 2 ? "opacity-100" : "opacity-60"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${pasoCompletado(2) || pasoActual === 2 ? "bg-[#004bb7] text-white shadow-sm" : "bg-slate-100 border border-slate-300 text-slate-600"}`}
              >
                {pasoCompletado(2) ? "✓" : "2"}
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0A193D]">
                  2. Precio
                </h3>
                <p className="hidden md:block text-[10px] text-slate-500 mt-0.5">
                  Operación y gastos
                </p>
              </div>
              {pasoActual === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />
              )}
            </div>

            {[['Características', 'Superficie y distribución'], ['Comodidades', 'Servicios y equipamiento'], ['Descripción', 'Detalles de la publicación'], ['Imágenes', 'Fotos del inmueble'], ['Condiciones', 'Datos finales de la operación']].map(([label, description], index) => {
              const step = (index + 3) as typeof pasoActual;
              if (esTerreno && label === "Comodidades") return null;
              return (
                <div key={label} onClick={() => puedeSeleccionarPaso(step) && seleccionarParte(step)} className={`flex items-start gap-2 relative pb-3 cursor-pointer transition-opacity ${pasoActual === step ? "opacity-100" : "opacity-60"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${pasoCompletado(step) || pasoActual === step ? "bg-[#004bb7] text-white shadow-sm" : "bg-slate-100 border border-slate-300 text-slate-600"}`}>{pasoCompletado(step) ? "✓" : numeroVisiblePaso(step)}</div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0A193D]">{numeroVisiblePaso(step)}. {label}</h3>
                    <p className="hidden md:block text-[10px] text-slate-500 mt-0.5">{description}</p>
                  </div>
                  {pasoActual === step && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />}
                </div>
              );
            })}
          </div>
        </div>}

        {/* CONTENIDO PASO 1 */}
        {(modoEdicion || pasoActual <= 4) && (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); avanzarPaso(); }}>
            {/* 1. Información principal */}
            <div className={`${mostrarParte(1) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs`}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center text-xs font-bold shrink-0">
                  i
                </div>
                <h2 className="text-base font-bold text-[#0A193D]">
                  1. Información principal
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título de publicación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Título de publicación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Departamento 2 ambientes con cochera – Centro"
                    value={formData.titulo}
                    onChange={(e) => {
                      limpiarErrorCampo("titulo");
                      setFormData({ ...formData, titulo: e.target.value });
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-lg border ${erroresCampos.titulo ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400`}
                  />
                  {erroresCampos.titulo && <p className="text-[11px] text-red-500 mt-1 font-medium">{erroresCampos.titulo}</p>}
                </div>

                {/* Código interno */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Código interno (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: DEP-000123"
                    value={formData.codigoInterno}
                    onChange={(e) => setFormData({ ...formData, codigoInterno: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400"
                  />
                </div>

                {/* Tipo de inmueble */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tipo de inmueble <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipoInmueble}
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
                    className={`w-full text-xs px-3.5 py-2.5 rounded-lg border ${erroresCampos.tipoInmueble ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700`}
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="departamento">Departamento</option>
                    <option value="casa">Casa</option>
                    <option value="local">Local comercial</option>
                    <option value="terreno">Terreno</option>
                  </select>
                  {erroresCampos.tipoInmueble && <p className="text-[11px] text-red-500 mt-1 font-medium">{erroresCampos.tipoInmueble}</p>}
                </div>

                {/* Categoría / Operación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Categoría / Operación <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoriaOperacion}
                    onChange={(e) => {
                      limpiarErrorCampo("categoriaOperacion");
                      setFormData({ ...formData, categoriaOperacion: e.target.value });
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-lg border ${erroresCampos.categoriaOperacion ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700`}
                  >
                    <option value="">Seleccionar</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                    {permiteAlquilerTemporario && <option value="temporario">Alquiler temporario</option>}
                  </select>
                  {erroresCampos.categoriaOperacion && <p className="text-[11px] text-red-500 mt-1 font-medium">{erroresCampos.categoriaOperacion}</p>}
                </div>

                {/* Estado (solo en edición) */}
                {modoEdicion && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Estado de la propiedad
                    </label>
                    <select
                      value={estadoPropiedad}
                      onChange={(e) => setEstadoPropiedad(e.target.value as "disponible" | "reservado" | "alquilado" | "vendido")}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
                    >
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="alquilado">Alquilado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>
                )}

                {/* Ciudad / Zona / Barrio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Localidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ciudadZonaBarrio}
                    onChange={(e) => {
                      limpiarErrorCampo("ciudadZonaBarrio");
                      actualizarUbicacionTexto("ciudadZonaBarrio", e.target.value);
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-lg border ${erroresCampos.ciudadZonaBarrio ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700`}
                  >
                    <option value="">Seleccionar localidad</option>
                    {formData.ciudadZonaBarrio && !localidades.includes(formData.ciudadZonaBarrio) && (
                      <option value={formData.ciudadZonaBarrio}>{formData.ciudadZonaBarrio}</option>
                    )}
                    {localidades.map((localidad) => (
                      <option key={localidad} value={localidad}>{localidad}</option>
                    ))}
                  </select>
                  {erroresCampos.ciudadZonaBarrio && <p className="text-[11px] text-red-500 mt-1 font-medium">{erroresCampos.ciudadZonaBarrio}</p>}
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Provincia <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full text-xs py-2.5 text-slate-700">
                    Entre Ríos
                  </div>
                </div>

                {/* Dirección completa */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Dirección <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: San Martin 1200"
                    value={formData.direccionCompleta}
                    onChange={(e) => {
                      limpiarErrorCampo("direccionCompleta");
                      actualizarUbicacionTexto("direccionCompleta", e.target.value);
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-lg border ${erroresCampos.direccionCompleta ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400`}
                  />
                  {erroresCampos.direccionCompleta && <p className="text-[11px] text-red-500 mt-1 font-medium">{erroresCampos.direccionCompleta}</p>}
                </div>

                {/* Referencias */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Referencias / Detalles de ubicación (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: A metros de Av. Principal, cerca de plazas y comercios"
                    value={formData.referenciasUbicacion}
                    onChange={(e) => setFormData({ ...formData, referenciasUbicacion: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Tres tarjetas inferiores en columnas */}
            <div className={`${modoEdicion || pasoActual >= 2 && pasoActual <= 4 ? "" : "!hidden"} grid grid-cols-1 lg:grid-cols-3 gap-6 items-start`}>
              {/* 2. Precio y operación */}
              <div className={`${mostrarParte(2) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center text-xs font-bold shrink-0">
                    $
                  </div>
                  <h2 className="text-sm font-bold text-[#0A193D]">
                    2. Precio y operación
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {formData.categoriaOperacion === "alquiler" ? "Precio mensual" : `Precio (${formData.moneda})`} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder={formData.moneda === "ARS" ? "Ej: 98640000" : "Ej: 72000"}
                        value={formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD}
                        onChange={(e) => {
                          limpiarErrorCampo("precio");
                          handleNonNegativeNumberChange(formData.moneda === "ARS" ? "precioARS" : "precioUSD", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.precio ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.precio && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.precio}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Moneda
                      </label>
                      <select
                        value={formData.moneda}
                        onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                        className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white"
                      >
                        <option value="USD">Dólar (USD)</option>
                        <option value="ARS">Peso argentino (ARS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5">
                    {estadoCotizacionBlue === "disponible" && cotizacionBlue ? (
                      <>
                        <p className="text-[11px] font-semibold text-slate-700">
                          Cotización Dólar Blue venta: ${cotizacionBlue.toLocaleString("es-AR")}
                        </p>
                        {formData.moneda === "USD" && valorReferencialARS !== null && (
                          <p className="mt-1 text-sm font-bold text-[#004bb7]">
                            Valor referencial: ≈ ${valorReferencialARS.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS
                          </p>
                        )}
                        {formData.moneda === "ARS" && valorReferencialUSD !== null && (
                          <p className="mt-1 text-sm font-bold text-[#004bb7]">
                            Valor referencial: ≈ USD ${valorReferencialUSD.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-500">
                          {fechaCotizacionFormateada ? `Actualizado: ${fechaCotizacionFormateada}. ` : ""}
                          Valor referencial calculado según la cotización vigente del dólar Blue. Puede variar según la cotización actual.
                        </p>
                      </>
                    ) : estadoCotizacionBlue === "inicial" || estadoCotizacionBlue === "cargando" ? (
                      <p className="text-[10px] text-slate-500">Consultando cotización del Dólar Blue...</p>
                    ) : (
                      <p className="text-[10px] text-slate-500">No se pudo calcular temporalmente el equivalente. El precio en {formData.moneda} sigue disponible.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cotización dólar usada
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cotizacionBlue ?? formData.cotizacionDolar}
                      readOnly={cotizacionBlue !== null}
                      onChange={(e) => {
                        if (cotizacionBlue === null) {
                          handleNonNegativeNumberChange("cotizacionDolar", e.target.value);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Se guarda junto con la propiedad para explicar el equivalente.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Expensas
                      </label>
                      <select
                        value={formData.expensas}
                        onChange={(e) => setFormData({ ...formData, expensas: e.target.value })}
                        className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white"
                      >
                        <option value="">Seleccionar (opcional)</option>
                        <option value="no_incluye">No incluye expensas</option>
                        <option value="incluye">Incluye expensas</option>
                        <option value="sin_expensas">Sin expensas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Monto de expensas (ARS)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 72000"
                        value={formData.montoExpensas}
                        onChange={(e) => handleNonNegativeNumberChange("montoExpensas", e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Características del inmueble */}
              <div className={`${mostrarParte(3) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center text-xs shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-[#0A193D]">
                    3. Características del inmueble
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Superficie total (m²) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 80"
                        value={formData.superficieTotal}
                        onChange={(e) => {
                          limpiarErrorCampo("superficieTotal");
                          handleNonNegativeNumberChange("superficieTotal", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.superficieTotal ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.superficieTotal && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.superficieTotal}</p>}
                    </div>
                    {!esTerreno && <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cantidad de ambientes {esVivienda && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 2"
                        value={formData.cantidadAmbientes}
                        onChange={(e) => {
                          limpiarErrorCampo("cantidadAmbientes");
                          handleNonNegativeNumberChange("cantidadAmbientes", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.cantidadAmbientes ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.cantidadAmbientes && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.cantidadAmbientes}</p>}
                    </div>}
                  </div>

                  {esVivienda && <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Dormitorios <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 1"
                        value={formData.dormitorios}
                        onChange={(e) => {
                          limpiarErrorCampo("dormitorios");
                          handleNonNegativeNumberChange("dormitorios", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.dormitorios ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.dormitorios && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.dormitorios}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Baños <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 1"
                        value={formData.banos}
                        onChange={(e) => {
                          limpiarErrorCampo("banos");
                          handleNonNegativeNumberChange("banos", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.banos ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.banos && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.banos}</p>}
                    </div>
                  </div>}

                  {!esTerreno && <div className="grid grid-cols-2 gap-2 items-center pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                        Cochera
                      </label>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="cochera"
                            value="si"
                            checked={formData.cochera === "si"}
                            onChange={(e) => setFormData({ ...formData, cochera: e.target.value })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Sí</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="cochera"
                            value="no"
                            checked={formData.cochera === "no"}
                            onChange={(e) => setFormData({ ...formData, cochera: e.target.value })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Piso / Unidad (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Piso 3, Unidad A"
                        value={formData.pisoUnidad}
                        onChange={(e) => setFormData({ ...formData, pisoUnidad: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>}
                </div>
              </div>

              {/* 4. Comodidades y equipamiento */}
              <div className={`${esTerreno || !mostrarParte(4) ? "!hidden" : ""} bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center text-xs shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-[#0A193D]">
                    4. Comodidades y equipamiento
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                  {comodidadesList.map((item) => {
                    const isSelected = comodidadesSeleccionadas.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleComodidad(item.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium text-left transition-all ${
                          isSelected
                            ? "border-[#004bb7] bg-blue-50/80 text-[#004bb7] shadow-2xs"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="text-xs shrink-0">{item.icon}</span>
                        <span className="truncate leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Otras comodidades (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gimnasio, SUM, Playroom, etc."
                    value={formData.otrasComodidades}
                    onChange={(e) => setFormData({ ...formData, otrasComodidades: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer de navegación Form 1 */}
            {!modoEdicion && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                {pasoActual > 1 ? (
                  <button
                    type="button"
                    onClick={retrocederPaso}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    ← Volver
                  </button>
                ) : (
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    ← Volver
                  </Link>
                )}

                <div className="flex items-center gap-3 justify-end flex-1">
                  {mensaje && (
                    <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                      {mensaje}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={avanzarPaso}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm active:scale-95"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* CONTENIDO PASO 2 */}
        {(modoEdicion || pasoActual >= 5) && (
          <form className="space-y-6" onSubmit={publicarPropiedad}>
            {/* Grilla superior: 5. Descripción y 6. Ubicación */}
            <div className={`${modoEdicion || pasoActual === 5 ? "" : "!hidden"} grid grid-cols-1 lg:grid-cols-2 gap-6`}>
              {/* 5. Descripción */}
              <div className={`${mostrarParte(5) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col`}>
                <div className="flex items-start gap-2.5 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0A193D]">
                      5. Descripción
                    </h2>
                    <p className="text-xs text-slate-500">
                      Contanos más sobre tu propiedad.
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <textarea
                    rows={8}
                    placeholder="Describí las características del inmueble, entorno, estado general, ventajas, etc."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    maxLength={3000}
                    className="w-full flex-1 text-xs p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/20 placeholder:text-slate-400 resize-none leading-relaxed"
                  />
                  <div className="text-right mt-2 text-[11px] text-slate-400 font-medium">
                    {formData.descripcion.length} / 3.000
                  </div>
                </div>
              </div>

              {/* 6. Ubicación */}
              <div className={`${mostrarParte(5) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col`}>
                <div className="flex items-start gap-2.5 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0A193D]">
                      6. Ubicación
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ubicación exacta para mostrar en el mapa.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Referencia de Google Maps (opcional)
                    </label>
                    <input
                      type="url"
                      placeholder="Ej: https://maps.app.goo.gl/..."
                      value={formData.linkGoogleMaps}
                      onChange={(e) => actualizarUbicacionTexto("linkGoogleMaps", e.target.value)}
                      onBlur={(e) => completarCoordenadasDesdeLink(e.target.value.trim())}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400 bg-slate-50/20"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      {resolviendoMapa ? "Buscando coordenadas..." : "Al salir del campo se completan latitud y longitud automáticamente."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Latitud (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: -31.731706"
                        value={formData.latitud}
                        onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400 bg-slate-50/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Longitud (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: -60.52318"
                        value={formData.longitud}
                        onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400 bg-slate-50/20"
                      />
                    </div>
                  </div>

                  <SelectorUbicacionMapa
                    latitud={formData.latitud}
                    longitud={formData.longitud}
                    onChange={(lat, lng) => {
                      setFormData((current) => ({
                        ...current,
                        latitud: lat,
                        longitud: lng,
                      }));
                    }}
                    direccionSugerida={formData.direccionCompleta}
                    ciudadSugerida={formData.ciudadZonaBarrio}
                    provinciaSugerida={formData.provincia}
                  />
                </div>
              </div>
            </div>

            {/* Grilla intermedia: 7. Imágenes y 8. Configuración de contacto */}
            <div className={`${modoEdicion || pasoActual === 6 ? "" : "!hidden"} grid grid-cols-1 lg:grid-cols-2 gap-6`}>
              {/* 7. Imágenes */}
              <div className={`${mostrarParte(6) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col justify-between`}>
                <div>
                  <div className="flex items-start gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#0A193D]">
                        7. Imágenes
                      </h2>
                      <p className="text-xs text-slate-500">
                        Subí fotos de la propiedad (hasta 20 imágenes).
                      </p>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <label
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setArrastrandoImagenes(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setArrastrandoImagenes(false);
                    }}
                    onDrop={handleSoltarImagenes}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition group ${
                      arrastrandoImagenes
                        ? "border-[#004bb7] bg-blue-50"
                        : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
                    } cursor-pointer`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleSubirImagenes}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-[#004bb7] transition mb-2">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {arrastrandoImagenes ? "Soltá las imágenes aquí" : <>Arrastrá las imágenes aquí o <span className="text-[#004bb7]">hacé clic para seleccionar</span></>}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP — hasta 20 MB por archivo
                    </p>
                  </label>

                  {/* Galería de miniaturas */}
                  {imagenes.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {imagenes.map((imgUrl, index) => (
                        <div
                          key={index}
                          className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 group shadow-2xs"
                        >
                          <img
                            src={imgUrl}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => eliminarImagen(index)}
                            className="absolute top-1 right-1 w-4 h-4 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center text-[10px] transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  <svg className="w-3.5 h-3.5 text-[#004bb7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>La primera imagen será la imagen principal.</span>
                </div>
              </div>

              {/* 8. Configuración de contacto */}
              <div className={`${mostrarParte(6) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col justify-between`}>
                <div>
                  <div className="flex items-start gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#0A193D]">
                        8. Configuración de contacto
                      </h2>
                      <p className="text-xs text-slate-500">
                        Elegí cómo los interesados podrán contactarte.
                      </p>
                    </div>
                  </div>

                  {/* Checkboxes con descripción */}
                  <div className="space-y-3 mb-5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permitirVisita}
                        onChange={(e) => setFormData({ ...formData, permitirVisita: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Permitir agendar visita
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Los usuarios pueden solicitar una visita al inmueble.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permitirWhatsApp}
                        onChange={(e) => setFormData({ ...formData, permitirWhatsApp: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Permitir contacto por WhatsApp
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Mostrar botón de WhatsApp en la publicación.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permitirEmail}
                        onChange={(e) => setFormData({ ...formData, permitirEmail: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Permitir envío de consulta por email
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Los usuarios podrán enviarte consultas.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Campos de Horario y Teléfono */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Horario de atención (opcional)
                    </label>
                    <select
                      value={formData.horarioAtencion}
                      onChange={(e) => setFormData({ ...formData, horarioAtencion: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700 truncate"
                    >
                      <option value="Lun a Vie 9 - 18 h • Sáb 9 - 13 h">Lun a Vie 9 - 18 h • Sáb 9 - 13 h</option>
                      <option value="Lun a Vie 8 - 17 h">Lun a Vie 8 - 17 h</option>
                      <option value="Todos los días 9 - 20 h">Todos los días 9 - 20 h</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Teléfono / WhatsApp (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: +54 9 343 4449922"
                      value={formData.telefonoWhatsApp}
                      onChange={(e) => setFormData({ ...formData, telefonoWhatsApp: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {formData.categoriaOperacion === "temporario" && permiteAlquilerTemporario ? (
              <>
                {/* 9. Datos de alquiler temporario */}
                <div className={`${mostrarParte(7) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs`}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[#0A193D]">
                  9. Datos de alquiler temporario{" "}
                  <span className="text-xs font-normal text-slate-400">
                    
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Campos inputs a la izquierda */}
                <div className="lg:col-span-9 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Precio por noche (USD) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 85"
                        value={formData.precioPorNocheUSD}
                        onChange={(e) => {
                          limpiarErrorCampo("precioPorNocheUSD");
                          handleNonNegativeNumberChange("precioPorNocheUSD", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.precioPorNocheUSD ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.precioPorNocheUSD && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.precioPorNocheUSD}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mínimo de noches <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 2"
                        value={formData.minimoNoches}
                        onChange={(e) => {
                          limpiarErrorCampo("minimoNoches");
                          handleNonNegativeNumberChange("minimoNoches", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.minimoNoches ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.minimoNoches && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.minimoNoches}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Huéspedes máximos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 2"
                        value={formData.huespedesMaximos}
                        onChange={(e) => {
                          limpiarErrorCampo("huespedesMaximos");
                          handleNonNegativeNumberChange("huespedesMaximos", e.target.value);
                        }}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${erroresCampos.huespedesMaximos ? "border-red-500 ring-1 ring-red-500 bg-red-50/20" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400`}
                      />
                      {erroresCampos.huespedesMaximos && <p className="text-[10px] text-red-500 mt-1 font-medium">{erroresCampos.huespedesMaximos}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Costo de limpieza (USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 25"
                        value={formData.costoLimpiezaUSD}
                        onChange={(e) => handleNonNegativeNumberChange("costoLimpiezaUSD", e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Check-in desde
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.checkInDesde}
                          onChange={(e) => setFormData({ ...formData, checkInDesde: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Check-out hasta
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.checkOutHasta}
                          onChange={(e) => setFormData({ ...formData, checkOutHasta: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                        Check-in flexible
                      </label>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="checkInFlexible"
                            value="si"
                            checked={formData.checkInFlexible === "si"}
                            onChange={(e) => setFormData({ ...formData, checkInFlexible: e.target.value })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Sí</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="checkInFlexible"
                            value="no"
                            checked={formData.checkInFlexible === "no"}
                            onChange={(e) => setFormData({ ...formData, checkInFlexible: e.target.value })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen Total Estimado */}
                <div className="lg:col-span-3 bg-[#eef4ff] border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-medium text-slate-500 mb-1">
                    Total estimado
                  </span>
                  <div className="text-lg font-bold text-[#0A193D]">
                    USD 255 <span className="text-xs font-normal text-slate-500">/ 3 noches</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                    ≈ $306.000 ARS
                  </span>
                </div>
              </div>
            </div>
              </>
            ) : (
              <div className={`${mostrarParte(7) ? "" : "!hidden"} bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs`}>
                <h2 className="text-sm font-bold text-[#0A193D]">
                  {formData.categoriaOperacion === "venta" ? "9. Condiciones de venta" : "9. Condiciones de alquiler"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.categoriaOperacion === "venta"
                    ? "La publicación mostrará el precio de venta y la moneda seleccionada."
                    : "La publicación mostrará el precio mensual y las expensas configuradas."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                    <span className="block text-[11px] font-semibold text-slate-500">Precio {formData.categoriaOperacion === "venta" ? "de venta" : "mensual"}</span>
                    <span className="text-sm font-bold text-[#0A193D]">
                      {formData.moneda} {Number(formData.moneda === "ARS" ? formData.precioARS : formData.precioUSD || 0).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                    <span className="block text-[11px] font-semibold text-slate-500">Expensas</span>
                    <span className="text-sm font-bold text-[#0A193D]">
                      {formData.expensas === "sin_expensas" ? "Sin expensas" : `ARS ${Number(formData.montoExpensas || 0).toLocaleString("es-AR")}`}
                    </span>
                  </div>
                </div>
                {formData.categoriaOperacion === "alquiler" && (
                  <div className="mt-4 max-w-sm">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Duración del contrato (opcional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        max={formData.unidadDuracionAlquiler === "meses" ? "11" : undefined}
                        placeholder={formData.unidadDuracionAlquiler === "meses" ? "Ej: 6" : "Ej: 1"}
                        value={formData.duracionAlquilerMeses}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const maxMeses = formData.unidadDuracionAlquiler === "meses" ? 11 : Number.MAX_SAFE_INTEGER;
                          handleNonNegativeNumberChange("duracionAlquilerMeses", e.target.value === "" ? "" : String(Math.min(value, maxMeses)));
                        }}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                      <select
                        value={formData.unidadDuracionAlquiler}
                        onChange={(e) => {
                          const unidad = e.target.value;
                          setFormData((current) => ({
                            ...current,
                            unidadDuracionAlquiler: unidad,
                            duracionAlquilerMeses: unidad === "meses" && Number(current.duracionAlquilerMeses) > 11 ? "11" : current.duracionAlquilerMeses,
                          }));
                        }}
                        className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="meses">Meses</option>
                        <option value="años">Años</option>
                      </select>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Dejalo vacío si el contrato no tiene un plazo definido.</p>
                  </div>
                )}
              </div>
            )}

            {formData.categoriaOperacion === "temporario" && permiteAlquilerTemporario && mostrarParte(7) && (
              /* 10. Normas de la estadía */
              <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[#0A193D]">
                  10. Normas de la estadía
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-700">
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Check-in desde 14:00 hs</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-700">
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Check-out hasta 11:00 hs</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-700">
                  <span className="text-red-500 text-sm shrink-0">🚭</span>
                  <span>No se permite fumar</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-700">
                  <span className="text-red-500 text-sm shrink-0">🚫</span>
                  <span>No se permiten mascotas</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-700">
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  <span className="leading-tight">Respetar descanso tras 22:00 hs</span>
                </div>
              </div>
              </div>
            )}

            {/* Footer de navegación Form 2 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              {!modoEdicion && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={retrocederPaso}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    ← Volver
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMensaje("");
                      setPasoActual(1);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                  >
                    Inicio
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end flex-1">
                {mensaje && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                    {mensaje}
                  </p>
                )}
                <button
                  type={modoEdicion || pasoActual === 7 ? "submit" : "button"}
                  onClick={modoEdicion || pasoActual === 7 ? undefined : avanzarPaso}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm active:scale-95"
                >
                  {cargandoPropiedad ? "Cargando..." : modoEdicion ? "Guardar cambios →" : pasoActual === 7 ? "Publicar propiedad →" : "Siguiente →"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
