"use client";

import { useState } from "react";
import Link from "next/link";

export default function NuevaPropiedadPage() {
  // Control de paso (1 o 2)
  const [pasoActual, setPasoActual] = useState<1 | 2>(2);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Paso 1
    titulo: "Departamento 2 ambientes con cochera – Centro",
    codigoInterno: "DEP-000123",
    tipoInmueble: "departamento",
    categoriaOperacion: "temporario",
    ciudadZonaBarrio: "Centro",
    provincia: "entre_rios",
    direccionCompleta: "San Martin 1200, Paraná, Entre Ríos",
    referenciasUbicacion: "A metros de Av. Principal, cerca de plazas y comercios",
    precioUSD: "72000",
    moneda: "USD",
    precioARS: "96.840.000",
    expensas: "no_incluye",
    montoExpensas: "72000",
    superficieTotal: "80",
    cantidadAmbientes: "2",
    dormitorios: "1",
    banos: "1",
    cochera: "si",
    pisoUnidad: "Piso 3, Unidad A",
    otrasComodidades: "Gimnasio, SUM, Playroom, etc.",

    // Paso 2
    descripcion: "",
    linkGoogleMaps: "",
    latitud: "-31.731706",
    longitud: "-60.52318",
    permitirVisita: true,
    permitirWhatsApp: true,
    permitirEmail: true,
    horarioAtencion: "Lun a Vie 9 - 18 h • Sáb 9 - 13 h",
    telefonoWhatsApp: "+54 9 343 4449922",
    
    // Alquiler temporario
    precioPorNocheUSD: "85",
    minimoNoches: "2",
    huespedesMaximos: "2",
    costoLimpiezaUSD: "25",
    checkInDesde: "14:00",
    checkOutHasta: "11:00",
    checkInFlexible: "si",
  });

  const [comodidadesSeleccionadas, setComodidadesSeleccionadas] = useState<string[]>([
    "aire",
    "wifi",
    "balcon",
    "cochera_cubierta",
  ]);

  // Lista de imágenes de ejemplo para el diseño de referencia
  const [imagenes, setImagenes] = useState<string[]>([
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&auto=format&fit=crop&q=80",
  ]);

  const eliminarImagen = (indexAEliminar: number) => {
    setImagenes((prev) => prev.filter((_, idx) => idx !== indexAEliminar));
  };

  const toggleComodidad = (item: string) => {
    setComodidadesSeleccionadas((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
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

  const handleSubirImagenes = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newUrls = filesArray.map((file) => URL.createObjectURL(file));
      setImagenes((prev) => [...prev, ...newUrls].slice(0, 20));
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0A193D] tracking-tight">
              Nueva propiedad
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Completá los datos para publicar un inmueble
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Página {pasoActual} de 2
          </div>
        </div>

        {/* Stepper Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 mb-6 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Paso 1 */}
            <div
              onClick={() => setPasoActual(1)}
              className={`flex items-start gap-3.5 relative pb-3 cursor-pointer transition-opacity ${
                pasoActual === 1 ? "opacity-100" : "opacity-90"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                  pasoActual === 2
                    ? "bg-[#004bb7] text-white"
                    : "bg-[#004bb7] text-white"
                }`}
              >
                {pasoActual === 2 ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0A193D]">
                  Paso 1. Datos de la propiedad
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Información básica, características y comodidades
                </p>
              </div>
              {pasoActual === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />
              )}
            </div>

            {/* Paso 2 */}
            <div
              onClick={() => setPasoActual(2)}
              className={`flex items-start gap-3.5 relative pb-3 cursor-pointer transition-opacity ${
                pasoActual === 2 ? "opacity-100" : "opacity-60"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  pasoActual === 2
                    ? "bg-[#004bb7] text-white shadow-sm"
                    : "bg-slate-100 border border-slate-300 text-slate-600"
                }`}
              >
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0A193D]">
                  Paso 2. Publicación y configuración
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Descripción, ubicación, imágenes y contacto
                </p>
              </div>
              {pasoActual === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* CONTENIDO PASO 1 */}
        {pasoActual === 1 && (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setPasoActual(2); }}>
            {/* 1. Información principal */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
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
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400"
                  />
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
                    onChange={(e) => setFormData({ ...formData, tipoInmueble: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="departamento">Departamento</option>
                    <option value="casa">Casa</option>
                    <option value="local">Local comercial</option>
                    <option value="monoambiente">Monoambiente</option>
                    <option value="terreno">Terreno</option>
                  </select>
                </div>

                {/* Categoría / Operación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Categoría / Operación <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoriaOperacion}
                    onChange={(e) => setFormData({ ...formData, categoriaOperacion: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
                  >
                    <option value="">Seleccionar</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                    <option value="temporario">Alquiler temporario</option>
                  </select>
                </div>

                {/* Ciudad / Zona / Barrio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ciudad / Zona / Barrio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Centro"
                    value={formData.ciudadZonaBarrio}
                    onChange={(e) => setFormData({ ...formData, ciudadZonaBarrio: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400"
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Provincia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
                  >
                    <option value="">Seleccionar provincia</option>
                    <option value="entre_rios">Entre Ríos</option>
                    <option value="santa_fe">Santa Fe</option>
                    <option value="buenos_aires">Buenos Aires</option>
                    <option value="cordoba">Córdoba</option>
                  </select>
                </div>

                {/* Dirección completa */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Dirección completa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: San Martin 1200, Paraná, Entre Ríos"
                    value={formData.direccionCompleta}
                    onChange={(e) => setFormData({ ...formData, direccionCompleta: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/30 placeholder:text-slate-400"
                  />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* 2. Precio y operación */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full">
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
                        Precio en USD <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 72000"
                        value={formData.precioUSD}
                        onChange={(e) => setFormData({ ...formData, precioUSD: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
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
                        <option value="ARS">Peso (ARS)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Precio equivalente en ARS
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 96.840.000"
                      value={formData.precioARS}
                      onChange={(e) => setFormData({ ...formData, precioARS: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                    />
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
                        placeholder="Ej: 72000"
                        value={formData.montoExpensas}
                        onChange={(e) => setFormData({ ...formData, montoExpensas: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Características del inmueble */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full">
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
                        placeholder="Ej: 80"
                        value={formData.superficieTotal}
                        onChange={(e) => setFormData({ ...formData, superficieTotal: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cantidad de ambientes <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 2"
                        value={formData.cantidadAmbientes}
                        onChange={(e) => setFormData({ ...formData, cantidadAmbientes: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Dormitorios <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 1"
                        value={formData.dormitorios}
                        onChange={(e) => setFormData({ ...formData, dormitorios: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Baños <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 1"
                        value={formData.banos}
                        onChange={(e) => setFormData({ ...formData, banos: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center pt-1">
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
                  </div>
                </div>
              </div>

              {/* 4. Comodidades y equipamiento */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col h-full">
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

            {/* Footer de navegación Paso 1 */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                ← Volver
              </Link>

              <button
                type="button"
                onClick={() => setPasoActual(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm active:scale-95"
              >
                Siguiente →
              </button>
            </div>
          </form>
        )}

        {/* CONTENIDO PASO 2 */}
        {pasoActual === 2 && (
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Grilla superior: 5. Descripción y 6. Ubicación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 5. Descripción */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col">
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
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col">
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
                      Link de Google Maps (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: https://maps.app.goo.gl/..."
                      value={formData.linkGoogleMaps}
                      onChange={(e) => setFormData({ ...formData, linkGoogleMaps: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400 bg-slate-50/20"
                    />
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

                  {/* Vista previa del Mapa */}
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-[#e5e3df]">
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-90"
                      style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80')`,
                        backgroundPosition: "center 40%"
                      }}
                    >
                      {/* Overlay estilo mapa */}
                      <div className="absolute inset-0 bg-[#eef3f7]/60 backdrop-contrast-125" />
                    </div>

                    {/* Pin de ubicación */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative -top-2 flex flex-col items-center animate-bounce">
                        <svg className="w-8 h-8 text-red-600 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Controles de zoom */}
                    <div className="absolute top-2 right-2 flex flex-col bg-white rounded shadow-sm border border-slate-200 text-xs font-bold text-slate-700">
                      <button type="button" className="px-2 py-0.5 hover:bg-slate-100 border-b border-slate-200">+</button>
                      <button type="button" className="px-2 py-0.5 hover:bg-slate-100">-</button>
                    </div>

                    {/* Etiquetas en mapa */}
                    <div className="absolute bottom-2 left-2 text-[10px] text-slate-600 bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      Plaza 1° de Mayo, Paraná
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grilla intermedia: 7. Imágenes y 8. Configuración de contacto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 7. Imágenes */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col justify-between">
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
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition text-center group">
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
                      Arrastrá las imágenes aquí o <span className="text-[#004bb7]">hacé clic para seleccionar</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG — hasta 5 MB por archivo
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
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col justify-between">
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

            {/* 9. Datos de alquiler temporario */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[#0A193D]">
                  9. Datos de alquiler temporario{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (mostrar solo si la categoría es &quot;Alquiler temporario&quot;)
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
                        placeholder="Ej: 85"
                        value={formData.precioPorNocheUSD}
                        onChange={(e) => setFormData({ ...formData, precioPorNocheUSD: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mínimo de noches <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 2"
                        value={formData.minimoNoches}
                        onChange={(e) => setFormData({ ...formData, minimoNoches: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Huéspedes máximos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 2"
                        value={formData.huespedesMaximos}
                        onChange={(e) => setFormData({ ...formData, huespedesMaximos: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Costo de limpieza (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 25"
                        value={formData.costoLimpiezaUSD}
                        onChange={(e) => setFormData({ ...formData, costoLimpiezaUSD: e.target.value })}
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

            {/* 10. Normas de la estadía */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#004bb7] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[#0A193D]">
                  10. Normas de la estadía{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (mostrar solo si la categoría es &quot;Alquiler temporario&quot;)
                  </span>
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

            {/* Footer de navegación Paso 2 */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPasoActual(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  ← Volver
                </button>

                <button
                  type="button"
                  onClick={() => setPasoActual(1)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                >
                  Cancelar
                </button>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm active:scale-95"
              >
                Publicar propiedad →
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
