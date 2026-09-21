"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SelectorUbicacionMapaProps {
  latitud: string;
  longitud: string;
  onChange: (lat: string, lng: string) => void;
  direccionSugerida?: string;
  ciudadSugerida?: string;
  provinciaSugerida?: string;
}

interface ResultadoBusqueda {
  id: string;
  titulo: string;
  subtitulo: string;
  displayCompleto: string;
  lat: string;
  lon: string;
  tipo: "altura_exacta" | "calle" | "lugar" | "ciudad";
  ciudad: string;
  provincia: string;
  esEntreRios: boolean;
  score: number;
}

// Icono personalizado SVG de alta resolución con estilo moderno
const createCustomPinIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#004bb7" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="12" cy="9" r="3.2" fill="#ffffff"/>
      </svg>
      <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 10px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1.5px);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-map-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export default function SelectorUbicacionMapa({
  latitud,
  longitud,
  onChange,
  direccionSugerida = "",
  ciudadSugerida = "",
  provinciaSugerida = "entre_rios",
}: SelectorUbicacionMapaProps) {
	// Referencias al mapa, marcador y búsquedas pendientes
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Estados de UI
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [reversoCargando, setReversoCargando] = useState(false);
  const [direccionDetectada, setDireccionDetectada] = useState<string>("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [notificacion, setNotificacion] = useState<{ texto: string; tipo: "info" | "error" | "exito" } | null>(null);

  // Coordenadas por defecto (Centro de Entre Ríos / Paraná: -31.7319, -60.5238)
  const defaultLat = -31.7319;
  const defaultLng = -60.5238;

  const parsedLat = latitud ? parseFloat(latitud) : null;
  const parsedLng = longitud ? parseFloat(longitud) : null;
  const hasValidCoords = parsedLat !== null && !isNaN(parsedLat) && parsedLng !== null && !isNaN(parsedLng);

  const nombreProvincia = provinciaSugerida === "entre_rios" ? "Entre Ríos" : provinciaSugerida;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarResultados(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notificación temporal
  const mostrarMensaje = (texto: string, tipo: "info" | "error" | "exito" = "info") => {
    setNotificacion({ texto, tipo });
    setTimeout(() => {
      setNotificacion((curr) => (curr?.texto === texto ? null : curr));
    }, 5000);
  };

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = hasValidCoords ? (parsedLat as number) : defaultLat;
      const initialLng = hasValidCoords ? (parsedLng as number) : defaultLng;
      const initialZoom = hasValidCoords ? 17 : 13;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // Evento de clic en el mapa para marcar punto exacto
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        actualizarPosicion(lat, lng, false);
      });

      mapInstanceRef.current = map;

      if (hasValidCoords) {
        colocarMarcador(parsedLat as number, parsedLng as number, false);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Función para colocar o mover marcador
  const colocarMarcador = (lat: number, lng: number, flyTo: boolean = true) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pinIcon = createCustomPinIcon();

    if (!markerRef.current) {
      const newMarker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      newMarker.on("dragend", () => {
        const pos = newMarker.getLatLng();
        actualizarPosicion(pos.lat, pos.lng, false);
      });

      markerRef.current = newMarker;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    if (flyTo) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 17), {
        duration: 0.8,
      });
    }
  };

  // Reverse Geocoding para identificar la dirección al hacer clic o arrastrar
  const consultarDireccionInversa = async (lat: number, lng: number) => {
    try {
      setReversoCargando(true);
      // Intentar primero con ArcGIS Reverse Geocode (muy preciso para alturas en Argentina)
      const arcgisRevUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json`;
      const res = await fetch(arcgisRevUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.address?.Address || data.address?.Match_addr) {
          const addr = data.address;
          const calleAltura = addr.Address || addr.Match_addr.split(",")[0];
          const ciudad = addr.City || addr.Subregion || "";
          const prov = addr.Region || "";
          const texto = [calleAltura, ciudad, prov].filter(Boolean).join(", ");
          setDireccionDetectada(texto);
          return;
        }
      }

      // Fallback con Nominatim Reverse
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const resNom = await fetch(nomUrl, { headers: { "Accept-Language": "es" } });
      if (resNom.ok) {
        const dataNom = await resNom.json();
        const addr = dataNom.address || {};
        const calle = addr.road || addr.pedestrian || addr.suburb || "";
        const num = addr.house_number || "";
        const ciudad = addr.city || addr.town || addr.village || addr.municipality || "";
        const prov = addr.state || "";
        const texto = [calle ? `${calle} ${num}`.trim() : "", ciudad, prov].filter(Boolean).join(", ");
        if (texto) {
          setDireccionDetectada(texto);
        }
      }
    } catch {
      // No bloquear
    } finally {
      setReversoCargando(false);
    }
  };

  // Función cuando el usuario selecciona una posición (clic, gps, búsqueda o drag)
  const actualizarPosicion = (lat: number, lng: number, centrarMapa: boolean = true) => {
    const latStr = lat.toFixed(6);
    const lngStr = lng.toFixed(6);

    colocarMarcador(lat, lng, centrarMapa);
    onChange(latStr, lngStr);
    void consultarDireccionInversa(lat, lng);
  };

  // Sincronizar marcador si cambian latitud o longitud externamente
  useEffect(() => {
    if (hasValidCoords && mapInstanceRef.current) {
      const currentMarkerPos = markerRef.current?.getLatLng();
      const needsUpdate =
        !currentMarkerPos ||
        Math.abs(currentMarkerPos.lat - (parsedLat as number)) > 0.00001 ||
        Math.abs(currentMarkerPos.lng - (parsedLng as number)) > 0.00001;

      if (needsUpdate) {
        colocarMarcador(parsedLat as number, parsedLng as number, true);
      }
    } else if (!latitud && !longitud && markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
      setDireccionDetectada("");
    }
  }, [latitud, longitud]);

  // Manejar Geolocalización (GPS del navegador)
  const obtenerMiUbicacion = () => {
    if (!navigator.geolocation) {
      mostrarMensaje("Tu navegador no soporta geolocalización.", "error");
      return;
    }

    setObteniendoGps(true);
    setNotificacion(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObteniendoGps(false);
        const { latitude, longitude } = pos.coords;
        actualizarPosicion(latitude, longitude, true);
        mostrarMensaje("¡Ubicación GPS detectada correctamente!", "exito");
      },
      (err) => {
        setObteniendoGps(false);
        let errorMsg = "No se pudo acceder a tu ubicación GPS.";
        if (err.code === 1) {
          errorMsg = "Permiso denegado. Habilitá la ubicación en tu navegador.";
        } else if (err.code === 2) {
          errorMsg = "Ubicación GPS no disponible en este momento.";
        } else if (err.code === 3) {
          errorMsg = "Tiempo de espera agotado al consultar tu ubicación.";
        }
        mostrarMensaje(errorMsg, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Motor de Geocodificación Catastral y Búsqueda de Alturas
  const buscarDireccionesInteligente = async (textoConsulta: string) => {
    const raw = textoConsulta.trim();
    if (!raw || raw.length < 2) {
      setResultados([]);
      setMostrarResultados(false);
      return;
    }

    setBuscando(true);
    setNotificacion(null);

    // Limpieza de términos
    const queryLimpia = raw
      .replace(/#/g, "")
      .replace(/N°/gi, "")
      .replace(/\bAv\.\b/gi, "Avenida")
      .replace(/\bB°\b/gi, "Barrio")
      .replace(/\bBv\.\b/gi, "Boulevard")
      .trim();

    const ciudad = ciudadSugerida.trim();
    const provincia = nombreProvincia;

    // Generar combinaciones de consulta estructuradas
    const queryVariants: string[] = [];

    if (ciudad && !queryLimpia.toLowerCase().includes(ciudad.toLowerCase())) {
      queryVariants.push(`${queryLimpia}, ${ciudad}, ${provincia}, Argentina`);
      queryVariants.push(`${queryLimpia}, ${ciudad}, ${provincia}`);
    } else if (!queryLimpia.toLowerCase().includes("entre r") && !queryLimpia.toLowerCase().includes("argentina")) {
      queryVariants.push(`${queryLimpia}, ${provincia}, Argentina`);
    }

    queryVariants.push(`${queryLimpia}, Argentina`);
    queryVariants.push(queryLimpia);

    const promesas = [];

    // 1. ArcGIS World Geocoding Service (Excelente para alturas numéricas en Argentina)
    const fetchArcgis = async (q: string): Promise<ResultadoBusqueda[]> => {
      try {
        const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
          q
        )}&f=json&outFields=Match_addr,Addr_type,City,Subregion,Region,Country&maxLocations=8&countryCode=ARG`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.candidates || [])
          .filter((c: any) => c.score >= 70)
          .map((c: any) => {
            const attrs = c.attributes || {};
            const isStreetAddress =
              attrs.Addr_type === "StreetAddress" ||
              attrs.Addr_type === "PointAddress" ||
              attrs.Addr_type === "StreetAddressExt";
            const isStreet = attrs.Addr_type === "StreetName";
            const isCity = attrs.Addr_type === "Locality";

            const tipo: ResultadoBusqueda["tipo"] = isStreetAddress
              ? "altura_exacta"
              : isStreet
              ? "calle"
              : isCity
              ? "ciudad"
              : "lugar";

            const parts = c.address.split(",");
            const titulo = parts[0]?.trim() || c.address;
            const subtitulo = parts.slice(1).join(", ").trim();

            const isER =
              (attrs.Region || "").toLowerCase().includes("entre") ||
              (c.address || "").toLowerCase().includes("entre r") ||
              (c.location.y >= -34.5 && c.location.y <= -30.0 && c.location.x >= -61.0 && c.location.x <= -57.5);

            let score = c.score;
            if (isStreetAddress) score += 40;
            if (isER) score += 35;
            if (ciudad && (c.address || "").toLowerCase().includes(ciudad.toLowerCase())) score += 50;

            return {
              id: `arc-${c.location.y}-${c.location.x}-${Math.random()}`,
              titulo,
              subtitulo,
              displayCompleto: c.address,
              lat: String(c.location.y),
              lon: String(c.location.x),
              tipo,
              ciudad: attrs.City || attrs.Subregion || "",
              provincia: attrs.Region || "",
              esEntreRios: isER,
              score,
            };
          });
      } catch {
        return [];
      }
    };

    // 2. Photon Geocoder (Fuzzy / Rápido)
    const fetchPhoton = async (q: string): Promise<ResultadoBusqueda[]> => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-32.05&lon=-59.0&limit=5`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return (json.features || []).map((f: any) => {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties || {};
          const calle = p.street || p.name || "";
          const num = p.housenumber || "";
          const ciudadNombre = p.city || p.town || p.village || p.county || "";
          const estado = p.state || "";
          const titulo = num && calle ? `${calle} ${num}` : calle || ciudadNombre || raw;
          const subtitulo = [ciudadNombre, estado, p.country || "Argentina"].filter(Boolean).join(", ");
          const esER =
            estado.toLowerCase().includes("entre r") ||
            (lat >= -34.5 && lat <= -30.0 && lon >= -61.0 && lon <= -57.5);

          const tipo: ResultadoBusqueda["tipo"] = num ? "altura_exacta" : calle ? "calle" : "lugar";
          let score = 75;
          if (num) score += 30;
          if (esER) score += 35;
          if (ciudad && ciudadNombre.toLowerCase().includes(ciudad.toLowerCase())) score += 50;

          return {
            id: `ph-${lat}-${lon}-${Math.random()}`,
            titulo,
            subtitulo,
            displayCompleto: `${titulo}, ${subtitulo}`,
            lat: String(lat),
            lon: String(lon),
            tipo,
            ciudad: ciudadNombre,
            provincia: estado,
            esEntreRios: esER,
            score,
          };
        });
      } catch {
        return [];
      }
    };

    // Ejecutar búsquedas concurrentes en ArcGIS y Photon
    for (const q of queryVariants.slice(0, 2)) {
      promesas.push(fetchArcgis(q));
      promesas.push(fetchPhoton(q));
    }

    try {
      const lotes = await Promise.all(promesas);
      const combinados: ResultadoBusqueda[] = [];
      const coordsVistas = new Set<string>();

      for (const lote of lotes) {
        for (const item of lote) {
          const latF = parseFloat(item.lat);
          const lonF = parseFloat(item.lon);
          if (isNaN(latF) || isNaN(lonF)) continue;

          // Clave de unicidad por cercanía (~15 metros)
          const key = `${latF.toFixed(4)}|${lonF.toFixed(4)}`;
          if (coordsVistas.has(key)) continue;
          coordsVistas.add(key);

          combinados.push(item);
        }
      }

      // Ordenar: primero Altura Exacta, luego Entre Ríos, luego Score descendente
      combinados.sort((a, b) => {
        // Prioridad a alturas exactas sobre calles generales o ciudades
        const aExacta = a.tipo === "altura_exacta" ? 1 : 0;
        const bExacta = b.tipo === "altura_exacta" ? 1 : 0;
        if (aExacta !== bExacta) return bExacta - aExacta;

        return b.score - a.score;
      });

      setResultados(combinados);
      setMostrarResultados(true);

      if (combinados.length === 0) {
        mostrarMensaje(
          `No se encontró "${raw}". Probá con el nombre de la calle y ciudad (ej. Urquiza, ${ciudad || "Gualeguaychú"}) o marcá el punto en el mapa.`,
          "info"
        );
      }
    } catch {
      mostrarMensaje("Error al buscar la dirección.", "error");
    } finally {
      setBuscando(false);
    }
  };

  // Manejar cambio en input de búsqueda (con debounce de 400ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusquedaTexto(valor);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (valor.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        void buscarDireccionesInteligente(valor);
      }, 400);
    } else {
      setResultados([]);
      setMostrarResultados(false);
    }
  };

  // Seleccionar resultado de la lista
  const seleccionarResultado = (item: ResultadoBusqueda) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      actualizarPosicion(lat, lng, true);
      setMostrarResultados(false);
      setBusquedaTexto(item.titulo ? `${item.titulo}, ${item.ciudad || nombreProvincia}` : item.displayCompleto);
      mostrarMensaje(`📍 Ubicación fijada: ${item.titulo}`, "exito");
    }
  };

  // Búsqueda con la dirección cargada en el formulario
  const buscarDireccionDelFormulario = () => {
    const partes = [direccionSugerida, ciudadSugerida, nombreProvincia, "Argentina"].filter(Boolean);
    const query = partes.join(", ");
    setBusquedaTexto(query);
    void buscarDireccionesInteligente(query);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Barra de Búsqueda y Herramientas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {buscando ? (
              <svg className="animate-spin w-4 h-4 text-[#004bb7]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          <input
            type="text"
            placeholder={
              ciudadSugerida
                ? `Buscar calle y altura (ej: Urquiza 500, ${ciudadSugerida})...`
                : "Buscar calle y altura (ej: Urquiza 500, Paraná)..."
            }
            value={busquedaTexto}
            onChange={handleInputChange}
            onFocus={() => {
              if (resultados.length > 0) setMostrarResultados(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                void buscarDireccionesInteligente(busquedaTexto);
              }
            }}
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/40 placeholder:text-slate-400 shadow-2xs font-normal"
          />

          {busquedaTexto && (
            <button
              type="button"
              onClick={() => {
                setBusquedaTexto("");
                setResultados([]);
                setMostrarResultados(false);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              title="Limpiar búsqueda"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Menú de resultados flotante con etiquetas de precisión */}
          {mostrarResultados && resultados.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[1000] overflow-hidden max-h-72 overflow-y-auto animate-fade-in-up">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span>Direcciones encontradas</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-[#004bb7] text-[10px] font-bold">
                    {resultados.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarResultados(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  ✕
                </button>
              </div>

              <ul className="divide-y divide-slate-100">
                {resultados.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => seleccionarResultado(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition flex items-start gap-2.5 text-xs group"
                    >
                      <span className="text-[#004bb7] mt-0.5 shrink-0 text-sm group-hover:scale-110 transition-transform">
                        {item.tipo === "altura_exacta" ? "🏠" : item.tipo === "calle" ? "🛣️" : "📍"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {item.titulo}
                          </span>
                          {item.tipo === "altura_exacta" && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                              ✓ Altura exacta
                            </span>
                          )}
                          {item.esEntreRios && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              Entre Ríos
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitulo || item.displayCompleto}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Botón Buscar */}
        <button
          type="button"
          disabled={buscando || !busquedaTexto.trim()}
          onClick={() => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            void buscarDireccionesInteligente(busquedaTexto);
          }}
          className="px-4 py-2.5 bg-[#004bb7] hover:bg-[#003c94] disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-[0.98]"
        >
          {buscando ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar</span>
            </>
          )}
        </button>

        {/* Botón Usar mi Ubicación Actual (GPS) */}
        <button
          type="button"
          disabled={obteniendoGps}
          onClick={obtenerMiUbicacion}
          title="Detectar y centrar en tu ubicación GPS actual"
          className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs active:scale-[0.98]"
        >
          {obteniendoGps ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Localizando...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.071-7.071l-1.414 1.414M8.343 15.657l-1.414 1.414m0-11.314l1.414 1.414m8.486 8.486l1.414 1.414" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} />
              </svg>
              <span>Mi ubicación</span>
            </>
          )}
        </button>
      </div>

      {/* Sugerencia rápida con la dirección cargada en el formulario */}
      {(direccionSugerida || ciudadSugerida) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-blue-50/40 px-3 py-1.5 rounded-lg border border-blue-100">
          <div className="flex items-center gap-1.5 truncate">
            <span>💡 <strong>Dirección del formulario:</strong></span>
            <span className="text-slate-800 font-semibold truncate max-w-sm">
              {[direccionSugerida, ciudadSugerida, nombreProvincia].filter(Boolean).join(", ")}
            </span>
          </div>
          <button
            type="button"
            onClick={buscarDireccionDelFormulario}
            className="text-[#004bb7] hover:underline font-bold shrink-0 flex items-center gap-1"
          >
            <span>Buscar en mapa</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}

      {/* Mensaje de estado / notificación */}
      {notificacion && (
        <div
          className={`text-xs px-3.5 py-2 rounded-lg flex items-center justify-between transition-all ${
            notificacion.tipo === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : notificacion.tipo === "exito"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-blue-50 text-[#004bb7] border border-blue-200"
          }`}
        >
          <span className="leading-snug">{notificacion.texto}</span>
          <button
            type="button"
            onClick={() => setNotificacion(null)}
            className="font-bold opacity-60 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contenedor del Mapa Interactivo */}
      <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Badge de coordenadas e información de punto seleccionado */}
        <div className="absolute bottom-2 left-2 right-2 sm:right-auto z-[400] pointer-events-none max-w-md">
          <div className="bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200/90 shadow-md text-[11px] text-slate-700 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${hasValidCoords ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
              {hasValidCoords ? (
                <span className="font-semibold text-slate-900 truncate">
                  📍 {parsedLat?.toFixed(5)}, {parsedLng?.toFixed(5)}
                </span>
              ) : (
                <span className="text-slate-600 font-medium">
                  👉 Hacé clic en el mapa o buscá tu dirección
                </span>
              )}
            </div>

            {hasValidCoords && (
              <p className="text-[10px] text-slate-500 truncate">
                {reversoCargando
                  ? "Identificando calle y altura..."
                  : direccionDetectada
                  ? `Identificado: ${direccionDetectada}`
                  : "Podés arrastrar el pin para mayor precisión"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          📌 <strong>Tip:</strong> Podés buscar calle y altura exacta, o hacer clic y arrastrar el pin para ajustar la posición.
        </span>
      </div>
    </div>
  );
}
