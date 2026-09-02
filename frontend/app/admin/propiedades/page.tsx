"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteProperty, getProperties, updateProperty } from "../../../services/api";

interface PropiedadAdmin {
  id: string;
  titulo: string;
  direccion: string;
  tipo: string;
  operacion: string;
  precio: string;
  estado: "disponible" | "reservado" | "alquilado";
  imagen: string;
}

export default function GestionPropiedadesPage() {
  const [propiedades, setPropiedades] = useState<PropiedadAdmin[]>([]);

  // Filtros y búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Estado para modal de edición
  const [propiedadAEditar, setPropiedadAEditar] = useState<PropiedadAdmin | null>(null);

  // Estado para modal de confirmación de eliminación
  const [propiedadAEliminar, setPropiedadAEliminar] = useState<PropiedadAdmin | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    getProperties()
      .then((properties) => setPropiedades(properties.map((property) => ({
        id: property._id,
        titulo: property.title,
        direccion: property.location,
        tipo: "Propiedad",
        operacion: "Venta",
        precio: `USD ${property.price.toLocaleString("es-AR")}`,
        estado: "disponible",
        imagen: property.images?.[0] ?? "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500",
      }))))
      .catch((error: Error) => setMensaje(error.message));
  }, []);

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipo("todos");
    setFiltroCategoria("todas");
    setFiltroEstado("todos");
  };

  // Filtrado reactivo
  const propiedadesFiltradas = propiedades.filter((p) => {
    const coincideTexto =
      p.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.direccion.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === "todos" || p.tipo.toLowerCase() === filtroTipo.toLowerCase();
    const coincideCategoria = filtroCategoria === "todas" || p.operacion.toLowerCase() === filtroCategoria.toLowerCase();
    const coincideEstado = filtroEstado === "todos" || p.estado.toLowerCase() === filtroEstado.toLowerCase();

    return coincideTexto && coincideTipo && coincideCategoria && coincideEstado;
  });

  // Conteo para métricas
  const totalDisponibles = propiedades.filter((p) => p.estado === "disponible").length;
  const totalReservadas = propiedades.filter((p) => p.estado === "reservado").length;
  const totalAlquiladas = propiedades.filter((p) => p.estado === "alquilado").length;

  // Manejador para eliminar
  const confirmarEliminacion = async () => {
    if (propiedadAEliminar) {
      try {
        await deleteProperty(propiedadAEliminar.id);
        setPropiedades((prev) => prev.filter((p) => p.id !== propiedadAEliminar.id));
        setPropiedadAEliminar(null);
        setMensaje("Propiedad eliminada correctamente");
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo eliminar la propiedad");
      }
    }
  };

  // Manejador para guardar edición
  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (propiedadAEditar) {
      try {
        await updateProperty(propiedadAEditar.id, {
          title: propiedadAEditar.titulo,
          location: propiedadAEditar.direccion,
          price: Number(propiedadAEditar.precio.replace(/[^0-9]/g, "")),
        });
        setPropiedades((prev) => prev.map((p) => (p.id === propiedadAEditar.id ? propiedadAEditar : p)));
        setPropiedadAEditar(null);
        setMensaje("Propiedad actualizada correctamente");
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo actualizar la propiedad");
      }
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

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto px-8 py-7">
        {mensaje && <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">{mensaje}</p>}
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-[#0A193D] tracking-tight">
            Gestión de propiedades
          </h1>

          <Link
            href="/admin/propiedades/nueva"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold rounded-lg transition shadow-sm active:scale-95"
          >
            <span className="text-base leading-none font-bold">+</span> Nueva propiedad
          </Link>
        </div>

        {/* 4 Tarjetas de Métricas KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total de propiedades con mini gráfico */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-extrabold text-[#0A193D] leading-none">
                  24
                </div>
                <h3 className="text-xs font-bold text-slate-800 mt-1.5">
                  Total de propiedades
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] leading-tight">
                  Resumen general de tu cartera inmobiliaria.
                </p>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded cursor-pointer mb-3">
                  <span>Últimos 6 meses</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Mini Gráfico de barras */}
                <div className="flex items-end gap-1.5 h-10">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-blue-200 rounded-t h-4" />
                    <span className="text-[8px] text-slate-400">Dic</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-blue-200 rounded-t h-6" />
                    <span className="text-[8px] text-slate-400">Ene</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-blue-300 rounded-t h-8" />
                    <span className="text-[8px] text-slate-400">Feb</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-blue-400 rounded-t h-10" />
                    <span className="text-[8px] text-slate-400">Mar</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-blue-300 rounded-t h-7" />
                    <span className="text-[8px] text-slate-400">Abr</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-1.5 bg-[#004bb7] rounded-t h-9" />
                    <span className="text-[8px] text-slate-400">May</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Disponibles */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Disponibles</span>
                <div className="text-2xl font-extrabold text-emerald-600 leading-tight">
                  {totalDisponibles}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Propiedades disponibles para comercializar.
            </p>
          </div>

          {/* Card 3: Reservadas */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Reservadas</span>
                <div className="text-2xl font-extrabold text-amber-600 leading-tight">
                  {totalReservadas}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Propiedades reservadas en proceso.
            </p>
          </div>

          {/* Card 4: Alquiladas */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Alquiladas</span>
                <div className="text-2xl font-extrabold text-blue-600 leading-tight">
                  {totalAlquiladas}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Propiedades actualmente alquiladas.
            </p>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 mb-6 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Input de Búsqueda */}
            <div className="md:col-span-5 relative">
              <input
                type="text"
                placeholder="Buscar por nombre o dirección..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filtro Tipo */}
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-400 font-medium -mt-1 mb-0.5">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="departamento">Departamento</option>
                <option value="casa">Casa</option>
                <option value="local">Local</option>
                <option value="monoambiente">Monoambiente</option>
              </select>
            </div>

            {/* Filtro Categoría */}
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-400 font-medium -mt-1 mb-0.5">Categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
              >
                <option value="todas">Todas</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
                <option value="temporario">Temporario</option>
              </select>
            </div>

            {/* Filtro Estado */}
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-400 font-medium -mt-1 mb-0.5">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="alquilado">Alquilado</option>
              </select>
            </div>

            {/* Botón Limpiar filtros */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full flex items-center justify-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden xl:inline">Limpiar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grilla de Tarjetas de Propiedades (2 columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {propiedadesFiltradas.length === 0 ? (
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              No se encontraron propiedades con los filtros seleccionados.
            </div>
          ) : (
            propiedadesFiltradas.map((prop) => (
              <div
                key={prop.id}
                className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex gap-3.5 hover:shadow-xs transition"
              >
                {/* Imagen */}
                <div className="w-36 h-28 shrink-0 rounded-lg overflow-hidden border border-slate-100 relative">
                  <img
                    src={prop.imagen}
                    alt={prop.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Información y Acciones */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Fila superior: Título y Badge de estado */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#0A193D] line-clamp-1">
                        {prop.titulo}
                      </h3>

                      {/* Badge de Estado */}
                      {prop.estado === "disponible" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Disponible
                        </span>
                      )}
                      {prop.estado === "reservado" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Reservado
                        </span>
                      )}
                      {prop.estado === "alquilado" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Alquilado
                        </span>
                      )}
                    </div>

                    {/* Ubicación */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{prop.direccion}</span>
                    </div>

                    {/* Características: Tipo, Operación y Precio */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {prop.tipo}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {prop.operacion}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-slate-800">{prop.precio}</span>
                    </div>
                  </div>

                  {/* Botones de Acción (Modificar y Eliminar) */}
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-50">
                    {/* Botón Editar */}
                    <button
                      type="button"
                      onClick={() => setPropiedadAEditar(prop)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50 text-[11px] font-semibold transition"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      type="button"
                      onClick={() => setPropiedadAEliminar(prop)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con Paginación */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Mostrando {propiedadesFiltradas.length} de {propiedades.length} propiedades
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50"
            >
              &lt;
            </button>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded bg-[#0A193D] text-white font-bold"
            >
              1
            </button>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* MODAL DE EDICIÓN (MODIFICAR PROPIEDAD) */}
        {propiedadAEditar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#0A193D]">
                  Modificar propiedad
                </h3>
                <button
                  type="button"
                  onClick={() => setPropiedadAEditar(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicion} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={propiedadAEditar.titulo}
                    onChange={(e) =>
                      setPropiedadAEditar({ ...propiedadAEditar, titulo: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={propiedadAEditar.direccion}
                      onChange={(e) =>
                        setPropiedadAEditar({ ...propiedadAEditar, direccion: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Precio
                    </label>
                    <input
                      type="text"
                      value={propiedadAEditar.precio}
                      onChange={(e) =>
                        setPropiedadAEditar({ ...propiedadAEditar, precio: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={propiedadAEditar.tipo}
                      onChange={(e) =>
                        setPropiedadAEditar({ ...propiedadAEditar, tipo: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="Departamento">Departamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Local">Local</option>
                      <option value="Monoambiente">Monoambiente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Operación
                    </label>
                    <select
                      value={propiedadAEditar.operacion}
                      onChange={(e) =>
                        setPropiedadAEditar({ ...propiedadAEditar, operacion: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="Venta">Venta</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Temporario">Temporario</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={propiedadAEditar.estado}
                      onChange={(e) =>
                        setPropiedadAEditar({
                          ...propiedadAEditar,
                          estado: e.target.value as "disponible" | "reservado" | "alquilado",
                        })
                      }
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="alquilado">Alquilado</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPropiedadAEditar(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#004bb7] hover:bg-[#003d96] text-white text-xs font-semibold transition shadow-sm"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {propiedadAEliminar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 animate-fade-in-up text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h3 className="text-sm font-bold text-[#0A193D]">
                ¿Eliminar propiedad?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ¿Estás seguro de que deseas eliminar <br />
                <span className="font-semibold text-slate-700">&quot;{propiedadAEliminar.titulo}&quot;</span>?
                Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setPropiedadAEliminar(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminacion}
                  className="px-5 py-2 rounded-lg bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-semibold transition shadow-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
