'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/AdminSidebar';
import {
  Contrato,
  EstadoContrato,
  getContratos,
  deleteContrato,
} from '../../../services/contratos';

export default function GestionContratosPage() {
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'activos' | 'finalizados' | 'cancelados' | 'por_vencer'>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('todas');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(5);

  // Menú flotante y modal
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [contratoDetalle, setContratoDetalle] = useState<Contrato | null>(null);
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'success' | 'info' | 'error' } | null>(null);

  const cargarContratos = useCallback(async () => {
    try {
      setCargando(true);
      setErrorCarga(null);
      const data = await getContratos();
      setContratos(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar contratos';
      setErrorCarga(msg);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarContratos();
  }, [cargarContratos]);

  const mostrarToast = (texto: string, tipo: 'success' | 'info' | 'error' = 'success') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroTab('todos');
    setFiltroFecha('todas');
    setPaginaActual(1);
  };

  // Filtrado de contratos
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto =
        !q ||
        c.numeroContrato.toLowerCase().includes(q) ||
        (c.codigoId ?? '').toLowerCase().includes(q) ||
        c.cliente.nombre.toLowerCase().includes(q) ||
        c.cliente.telefono.toLowerCase().includes(q) ||
        c.propiedad.titulo.toLowerCase().includes(q) ||
        c.propiedad.direccion.toLowerCase().includes(q);

      let coincideTab = true;
      if (filtroTab === 'activos') coincideTab = c.estado === 'activo';
      if (filtroTab === 'finalizados') coincideTab = c.estado === 'finalizado';
      if (filtroTab === 'cancelados') coincideTab = c.estado === 'cancelado';
      if (filtroTab === 'por_vencer') coincideTab = c.estado === 'por_vencer';

      let coincideEstado = true;
      if (filtroEstado !== 'todos') {
        coincideEstado = c.estado === filtroEstado;
      }

      let coincideFecha = true;
      if (filtroFecha !== 'todas') {
        coincideFecha = c.fechaInicio.includes(filtroFecha) || c.fechaFin.includes(filtroFecha);
      }

      return coincideTexto && coincideTab && coincideEstado && coincideFecha;
    });
  }, [contratos, busqueda, filtroTab, filtroEstado, filtroFecha]);

  // Paginación calculada
  const totalPaginas = Math.ceil(contratosFiltrados.length / porPagina) || 1;
  const contratosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return contratosFiltrados.slice(inicio, inicio + porPagina);
  }, [contratosFiltrados, paginaActual, porPagina]);

  const handleEliminar = async (id: string, num: string) => {
    if (!confirm(`¿Estás seguro de eliminar el contrato ${num}?`)) return;
    try {
      await deleteContrato(id);
      setContratos((prev) => prev.filter((c) => c._id !== id));
      setMenuAbiertoId(null);
      mostrarToast(`Contrato ${num} eliminado`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      mostrarToast(msg, 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* Toast Notification */}
      {mensajeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg bg-[#0A193D] text-white text-sm font-medium animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {mensajeToast.texto}
        </div>
      )}

      {/* Sidebar Admin con Contratos activo */}
      <AdminSidebar activeSection="contratos" />

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto px-8 py-7" onClick={() => setMenuAbiertoId(null)}>
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0A193D] tracking-tight">
              Gestión de contratos
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Visualizá, buscá y gestioná todos los contratos del sistema.
            </p>
          </div>

          <div>
            <Link
              href="/admin/contratos/generar"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#cc1f26] hover:bg-[#b0171d] text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Generar contrato
            </Link>
          </div>
        </div>

        {/* Barra superior de Filtros y Búsqueda */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Input Buscar */}
            <div className="flex-1 w-full relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por cliente, propiedad o número de contrato..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193B7B]/20 focus:border-[#193B7B] transition"
              />
            </div>

            {/* Dropdown Fecha */}
            <div className="w-full md:w-44 flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <select
                value={filtroFecha}
                onChange={(e) => {
                  setFiltroFecha(e.target.value);
                  setPaginaActual(1);
                }}
                className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todas">Fecha</option>
                <option value="2026">Año 2026</option>
                <option value="2025">Año 2025</option>
                <option value="08/2026">Agosto 2026</option>
                <option value="06/2026">Junio 2026</option>
              </select>
            </div>

            {/* Dropdown Estado */}
            <div className="w-full md:w-44 flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  if (e.target.value === 'todos') setFiltroTab('todos');
                  else if (e.target.value === 'activo') setFiltroTab('activos');
                  else if (e.target.value === 'finalizado') setFiltroTab('finalizados');
                  else if (e.target.value === 'cancelado') setFiltroTab('cancelados');
                  else if (e.target.value === 'por_vencer') setFiltroTab('por_vencer');
                  setPaginaActual(1);
                }}
                className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Estado</option>
                <option value="activo">Activos</option>
                <option value="finalizado">Finalizados</option>
                <option value="cancelado">Cancelados</option>
                <option value="por_vencer">Por vencer</option>
              </select>
            </div>

            {/* Limpiar Filtros */}
            <button
              onClick={limpiarFiltros}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/60 rounded-xl transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Pestañas de Estado con Línea Roja Activa + Contador */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 mb-6 gap-3">
          <div className="flex items-center gap-6 overflow-x-auto pb-px">
            {/* Todos */}
            <button
              onClick={() => { setFiltroTab('todos'); setFiltroEstado('todos'); setPaginaActual(1); }}
              className={`flex items-center gap-2 py-3 text-sm font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                filtroTab === 'todos' ? 'border-[#cc1f26] text-[#cc1f26]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Todos
            </button>

            {/* Activos */}
            <button
              onClick={() => { setFiltroTab('activos'); setFiltroEstado('activo'); setPaginaActual(1); }}
              className={`flex items-center gap-2 py-3 text-sm font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                filtroTab === 'activos' ? 'border-[#cc1f26] text-[#cc1f26]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
              Activos
            </button>

            {/* Finalizados */}
            <button
              onClick={() => { setFiltroTab('finalizados'); setFiltroEstado('finalizado'); setPaginaActual(1); }}
              className={`flex items-center gap-2 py-3 text-sm font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                filtroTab === 'finalizados' ? 'border-[#cc1f26] text-[#cc1f26]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finalizados
            </button>

            {/* Cancelados */}
            <button
              onClick={() => { setFiltroTab('cancelados'); setFiltroEstado('cancelado'); setPaginaActual(1); }}
              className={`flex items-center gap-2 py-3 text-sm font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                filtroTab === 'cancelados' ? 'border-[#cc1f26] text-[#cc1f26]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cancelados
            </button>

            {/* Por vencer */}
            <button
              onClick={() => { setFiltroTab('por_vencer'); setFiltroEstado('por_vencer'); setPaginaActual(1); }}
              className={`flex items-center gap-2 py-3 text-sm font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                filtroTab === 'por_vencer' ? 'border-[#cc1f26] text-[#cc1f26]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Por vencer
            </button>
          </div>

          <span className="text-sm font-bold text-[#193B7B] py-2 shrink-0">
            {contratosFiltrados.length} contratos
          </span>
        </div>

        {/* Estado de carga y error */}
        {cargando && (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm font-medium">Cargando contratos...</span>
          </div>
        )}

        {errorCarga && !cargando && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-700">Error al cargar los contratos</p>
              <p className="text-xs text-rose-500 mt-0.5">{errorCarga}</p>
            </div>
            <button
              onClick={cargarContratos}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tabla de Contratos */}
        {!cargando && !errorCarga && (
          <>
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3.5 px-5 font-semibold">N° Contrato</th>
                      <th className="py-3.5 px-4 font-semibold">Cliente</th>
                      <th className="py-3.5 px-4 font-semibold">Propiedad</th>
                      <th className="py-3.5 px-4 font-semibold">Fecha inicio</th>
                      <th className="py-3.5 px-4 font-semibold">Fecha fin</th>
                      <th className="py-3.5 px-4 font-semibold">Monto mensual</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {contratosPaginados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="font-medium text-slate-600">No se encontraron contratos</p>
                            <button onClick={limpiarFiltros} className="text-xs text-blue-600 hover:underline mt-1">
                              Restablecer filtros
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contratosPaginados.map((contrato) => (
                        <tr
                          key={contrato._id}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => setContratoDetalle(contrato)}
                        >
                          {/* N° Contrato con ícono */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <span className="font-bold text-[#193B7B] block text-sm leading-tight hover:underline">
                                  {contrato.numeroContrato}
                                </span>
                                {contrato.codigoId && (
                                  <span className="text-xs text-slate-400 font-normal">
                                    ID: {contrato.codigoId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Cliente */}
                          <td className="py-4 px-4">
                            <span className="font-semibold text-slate-900 block text-sm leading-tight">
                              {contrato.cliente.nombre}
                            </span>
                            <span className="text-xs text-slate-400 font-normal">
                              {contrato.cliente.telefono}
                            </span>
                          </td>

                          {/* Propiedad */}
                          <td className="py-4 px-4">
                            <span className="font-semibold text-slate-800 block text-sm leading-tight">
                              {contrato.propiedad.titulo}
                            </span>
                            <span className="text-xs text-slate-400 font-normal">
                              {contrato.propiedad.direccion}
                            </span>
                          </td>

                          {/* Fecha inicio */}
                          <td className="py-4 px-4 text-xs font-medium text-slate-800 whitespace-nowrap">
                            {contrato.fechaInicio}
                          </td>

                          {/* Fecha fin */}
                          <td className="py-4 px-4 text-xs font-medium text-slate-800 whitespace-nowrap">
                            {contrato.fechaFin}
                          </td>

                          {/* Monto mensual */}
                          <td className="py-4 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">
                            {contrato.montoMensual}
                          </td>

                          {/* Acciones */}
                          <td className="py-4 px-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 relative">
                              {/* Botón Ver (Ojo) */}
                              <button
                                type="button"
                                title="Ver detalles"
                                onClick={() => setContratoDetalle(contrato)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 hover:border-blue-200 transition"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Botón Editar / Generar (Lápiz) */}
                              <Link
                                href={`/admin/contratos/generar?id=${contrato._id}`}
                                title="Editar contrato"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 hover:border-blue-200 transition inline-block"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>

                              {/* Botón 3 puntos (Más acciones) */}
                              <button
                                type="button"
                                title="Más opciones"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuAbiertoId(menuAbiertoId === contrato._id ? null : contrato._id);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>

                              {/* Menú desplegable */}
                              {menuAbiertoId === contrato._id && (
                                <div
                                  className="absolute right-0 top-10 z-40 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 text-left text-xs font-medium text-slate-700 animate-in fade-in"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link
                                    href={`/admin/contratos/generar?id=${contrato._id}`}
                                    className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                                  >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Abrir generador
                                  </Link>

                                  <button
                                    onClick={() => { setContratoDetalle(contrato); setMenuAbiertoId(null); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                                  >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Descargar documento
                                  </button>

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    onClick={() => handleEliminar(contrato._id, contrato.numeroContrato)}
                                    className="w-full px-4 py-2 hover:bg-rose-50 flex items-center gap-2.5 text-rose-600"
                                  >
                                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación Inferior */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-medium text-slate-500">
              <div>
                Mostrando{' '}
                <strong className="text-slate-800">
                  {contratosFiltrados.length === 0 ? 0 : (paginaActual - 1) * porPagina + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-800">
                  {Math.min(paginaActual * porPagina, contratosFiltrados.length)}
                </strong>{' '}
                de <strong className="text-slate-800">{contratosFiltrados.length}</strong> contratos
              </div>

              <div className="flex items-center gap-1.5 self-center">
                {/* Botón Anterior */}
                <button
                  onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                  disabled={paginaActual === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ‹
                </button>

                {/* Números de página */}
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setPaginaActual(num)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs transition ${
                      paginaActual === num
                        ? 'bg-[#cc1f26] text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                {/* Botón Siguiente */}
                <button
                  onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={porPagina}
                  onChange={(e) => {
                    setPorPagina(Number(e.target.value));
                    setPaginaActual(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                </select>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal de Detalle de Contrato */}
      {contratoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Detalle de Contrato</span>
                <h3 className="text-lg font-extrabold text-[#193B7B]">
                  {contratoDetalle.numeroContrato}
                </h3>
              </div>
              <button
                onClick={() => setContratoDetalle(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Cliente:</span>
                  <span className="font-bold text-slate-800">{contratoDetalle.cliente.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Teléfono:</span>
                  <span className="text-slate-700">{contratoDetalle.cliente.telefono}</span>
                </div>
                {contratoDetalle.cliente.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Email:</span>
                    <span className="text-slate-700">{contratoDetalle.cliente.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Propiedad:</span>
                  <span className="font-bold text-slate-800">{contratoDetalle.propiedad.titulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Ubicación:</span>
                  <span className="text-slate-700">{contratoDetalle.propiedad.direccion}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 font-medium">Vigencia:</span>
                  <span className="font-semibold text-slate-800">
                    {contratoDetalle.fechaInicio} al {contratoDetalle.fechaFin}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Monto mensual:</span>
                  <span className="font-bold text-emerald-700 text-sm">{contratoDetalle.montoMensual}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Estado:</span>
                  <span className="font-bold capitalize text-slate-800">{contratoDetalle.estado.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Link
                href={`/admin/contratos/generar?id=${contratoDetalle._id}`}
                className="px-4 py-2 bg-[#cc1f26] hover:bg-[#b0171d] text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Abrir en generador
              </Link>
              <button
                type="button"
                onClick={() => setContratoDetalle(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
