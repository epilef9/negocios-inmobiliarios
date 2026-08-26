"use client";

import { useState } from "react";
import Link from "next/link";

export default function NuevaPropiedadPage() {
  // Estado para formulario
  const [formData, setFormData] = useState({
    titulo: "",
    codigoInterno: "",
    tipoInmueble: "",
    categoriaOperacion: "",
    ciudadZonaBarrio: "",
    provincia: "",
    direccionCompleta: "",
    referenciasUbicacion: "",
    precioUSD: "",
    moneda: "USD",
    precioARS: "",
    expensas: "no_incluye",
    montoExpensas: "",
    superficieTotal: "",
    cantidadAmbientes: "",
    dormitorios: "",
    banos: "",
    cochera: "si",
    pisoUnidad: "",
    otrasComodidades: "",
  });

  const [comodidadesSeleccionadas, setComodidadesSeleccionadas] = useState<string[]>([]);

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
            Página 1 de 2
          </div>
        </div>

        {/* Stepper Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 mb-6 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Paso 1 */}
            <div className="flex items-start gap-3.5 relative pb-3">
              <div className="w-8 h-8 rounded-full bg-[#004bb7] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0A193D]">
                  Paso 1. Datos de la propiedad
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Información básica, características y comodidades
                </p>
              </div>
              {/* Barra activa azul */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#004bb7] rounded-full" />
            </div>

            {/* Paso 2 */}
            <div className="flex items-start gap-3.5 opacity-60">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Paso 2. Publicación y configuración
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Descripción, ubicación, imágenes y contacto
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                  <option value="temporario">Temporario</option>
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

          {/* Footer de navegación */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              ← Volver
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm active:scale-95"
            >
              Siguiente →
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
