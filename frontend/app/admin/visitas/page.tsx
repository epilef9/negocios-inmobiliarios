'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../../components/AdminSidebar';
import {
  Visita,
  EstadoVisita,
  getStoredVisitas,
  updateVisitaEstado,
  addVisita,
  deleteVisita,
  resetVisitasToDefault,
} from '../../../services/visitas';

export default function GestionVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTab, setFiltroTab] = useState<'todas' | 'pendientes' | 'confirmadas' | 'rechazadas'>('todas');
  const [filtroFecha, setFiltroFecha] = useState<string>('todas');

  // Modales
  const [visitaAReprogramar, setVisitaAReprogramar] = useState<Visita | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [notaReprogramacion, setNotaReprogramacion] = useState('');

  const [visitaARechazar, setVisitaARechazar] = useState<Visita | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('Horario no disponible');

  const [visitaAAceptar, setVisitaAAceptar] = useState<Visita | null>(null);
  const [visitaDetalle, setVisitaDetalle] = useState<Visita | null>(null);

  const [modalNuevaVisita, setModalNuevaVisita] = useState(false);
  const [nuevaVisitaForm, setNuevaVisitaForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    propiedad: '',
    fecha: '',
    horario: '10:00 h',
    nota: '',
  });

  // Menú flotante de acciones por fila
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    setVisitas(getStoredVisitas());
  }, []);

  const mostrarToast = (texto: string, tipo: 'success' | 'info' | 'error' = 'success') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => {
      setMensajeToast(null);
    }, 3500);
  };

  // Métricas calculadas
  const metricas = useMemo(() => {
    const totalMes = visitas.length;
    const pendientes = visitas.filter((v) => v.estado === 'pendiente').length;
    // Confirmadas incluye las confirmadas y las reprogramadas (que son confirmadas con nuevo horario)
    const confirmadas = visitas.filter((v) => v.estado === 'confirmada' || v.estado === 'reprogramada').length;
    const rechazadas = visitas.filter((v) => v.estado === 'rechazada').length;

    return { totalMes, pendientes, confirmadas, rechazadas };
  }, [visitas]);

  // Lista filtrada
  const visitasFiltradas = useMemo(() => {
    return visitas.filter((visita) => {
      // Filtro texto (cliente o propiedad)
      const busqueda = filtroTexto.toLowerCase().trim();
      const coincideTexto =
        !busqueda ||
        visita.cliente.nombre.toLowerCase().includes(busqueda) ||
        visita.cliente.telefono.toLowerCase().includes(busqueda) ||
        visita.propiedad.titulo.toLowerCase().includes(busqueda);

      // Filtro pestaña (Todas / Pendientes / Confirmadas / Rechazadas)
      let coincideTab = true;
      if (filtroTab === 'pendientes') coincideTab = visita.estado === 'pendiente';
      if (filtroTab === 'confirmadas') coincideTab = visita.estado === 'confirmada' || visita.estado === 'reprogramada';
      if (filtroTab === 'rechazadas') coincideTab = visita.estado === 'rechazada';

      // Filtro select de estado
      let coincideEstado = true;
      if (filtroEstado !== 'todos') {
        coincideEstado = visita.estado === filtroEstado;
      }

      // Filtro fecha
      let coincideFecha = true;
      if (filtroFecha !== 'todas') {
        coincideFecha = visita.fecha === filtroFecha;
      }

      return coincideTexto && coincideTab && coincideEstado && coincideFecha;
    });
  }, [visitas, filtroTexto, filtroTab, filtroEstado, filtroFecha]);

  // Próximas 3 visitas para el widget lateral derecho
  const proximasVisitas = useMemo(() => {
    // Tomamos las primeras 3 que no estén rechazadas
    return visitas.filter((v) => v.estado !== 'rechazada').slice(0, 3);
  }, [visitas]);

  // Fechas únicas para el selector
  const fechasDisponibles = useMemo(() => {
    const set = new Set(visitas.map((v) => v.fecha));
    return Array.from(set);
  }, [visitas]);

  // Manejo de Aceptar visita
  const handleAceptarVisita = (visita: Visita) => {
    const updated = updateVisitaEstado(visita.id, 'confirmada');
    setVisitas(updated);
    setVisitaAAceptar(null);
    setMenuAbiertoId(null);
    mostrarToast(`Visita de ${visita.cliente.nombre} confirmada`);
  };

  // Manejo de Rechazar visita
  const handleConfirmarRechazo = () => {
    if (!visitaARechazar) return;
    const updated = updateVisitaEstado(visitaARechazar.id, 'rechazada', { motivo: motivoRechazo });
    setVisitas(updated);
    setVisitaARechazar(null);
    setMenuAbiertoId(null);
    mostrarToast(`Visita de ${visitaARechazar.cliente.nombre} rechazada`, 'info');
  };

  // Manejo de Reprogramar visita
  const handleConfirmarReprogramacion = () => {
    if (!visitaAReprogramar || !nuevaFecha || !nuevoHorario) {
      alert('Por favor completá la fecha y el horario.');
      return;
    }
    // Formatear fecha a DD/MM/YYYY si viene en YYYY-MM-DD
    let fechaFinal = nuevaFecha;
    if (nuevaFecha.includes('-')) {
      const [y, m, d] = nuevaFecha.split('-');
      fechaFinal = `${d}/${m}/${y}`;
    }

    let horarioFinal = nuevoHorario;
    if (!horarioFinal.includes('h')) {
      horarioFinal = `${horarioFinal} h`;
    }

    const updated = updateVisitaEstado(visitaAReprogramar.id, 'reprogramada', {
      nuevaFecha: fechaFinal,
      nuevoHorario: horarioFinal,
      motivo: notaReprogramacion,
    });
    setVisitas(updated);
    setVisitaAReprogramar(null);
    setNuevaFecha('');
    setNuevoHorario('');
    setNotaReprogramacion('');
    setMenuAbiertoId(null);
    mostrarToast(`Visita reprogramada para el ${fechaFinal} a las ${horarioFinal}`);
  };

  // Manejo de crear nueva visita
  const handleCrearNuevaVisita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaVisitaForm.nombre || !nuevaVisitaForm.propiedad || !nuevaVisitaForm.fecha) {
      alert('Por favor completá nombre, propiedad y fecha.');
      return;
    }

    let fechaFinal = nuevaVisitaForm.fecha;
    if (nuevaVisitaForm.fecha.includes('-')) {
      const [y, m, d] = nuevaVisitaForm.fecha.split('-');
      fechaFinal = `${d}/${m}/${y}`;
    }

    let horarioFinal = nuevaVisitaForm.horario || '10:00 h';
    if (!horarioFinal.includes('h')) {
      horarioFinal = `${horarioFinal} h`;
    }

    const iniciales = nuevaVisitaForm.nombre
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('');

    const updated = addVisita({
      cliente: {
        nombre: nuevaVisitaForm.nombre,
        telefono: nuevaVisitaForm.telefono || '+54 9 343 000 0000',
        email: nuevaVisitaForm.email,
        iniciales: iniciales || 'CL',
      },
      propiedad: {
        titulo: nuevaVisitaForm.propiedad,
      },
      fecha: fechaFinal,
      horario: horarioFinal,
      estado: 'pendiente',
      notaAdicional: nuevaVisitaForm.nota,
    });

    setVisitas(updated);
    setModalNuevaVisita(false);
    setNuevaVisitaForm({
      nombre: '',
      telefono: '',
      email: '',
      propiedad: '',
      fecha: '',
      horario: '10:00 h',
      nota: '',
    });
    mostrarToast('Nueva visita agendada correctamente');
  };

  // Eliminar visita
  const handleEliminarVisita = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar la visita de ${nombre}?`)) {
      const updated = deleteVisita(id);
      setVisitas(updated);
      setMenuAbiertoId(null);
      mostrarToast('Visita eliminada');
    }
  };

  // Generar link directo de WhatsApp
  const getWhatsAppLink = (visita: Visita) => {
    const telefonoLimpio = visita.cliente.telefono.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent(
      `Hola ${visita.cliente.nombre}, nos comunicamos desde la inmobiliaria respecto a tu visita programada para la propiedad "${visita.propiedad.titulo}" el día ${visita.fecha} a las ${visita.horario}.`
    );
    return `https://wa.me/${telefonoLimpio}?text=${mensaje}`;
  };

  // Colores de avatares según iniciales
  const getAvatarColorClass = (iniciales: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-sky-100 text-sky-700',
      'bg-teal-100 text-teal-700',
      'bg-amber-100 text-amber-700',
    ];
    const index = (iniciales.charCodeAt(0) + (iniciales.charCodeAt(1) || 0)) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* Toast Notification */}
      {mensajeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg bg-[#0A193D] text-white text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {mensajeToast.texto}
        </div>
      )}

      {/* Sidebar Admin */}
      <AdminSidebar activeSection="visitas" />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-7" onClick={() => setMenuAbiertoId(null)}>
        {/* Header Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0A193D] tracking-tight">
              Gestión de visitas
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Administrá solicitudes, confirmaciones y reprogramaciones
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalNuevaVisita(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#193B7B] hover:bg-[#122756] text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva visita
            </button>
          </div>
        </div>

        {/* 4 Tarjetas de Métricas (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Tarjeta 1: Visitas del mes */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 border-b-4 border-b-blue-500 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-blue-600 tracking-tight block">
                  {metricas.totalMes}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Visitas del mes
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Pendientes */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 border-b-4 border-b-amber-400 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-amber-500 tracking-tight block">
                  {metricas.pendientes}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pendientes
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Confirmadas */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 border-b-4 border-b-emerald-500 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-emerald-600 tracking-tight block">
                  {metricas.confirmadas}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Confirmadas
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 4: Rechazadas */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 border-b-4 border-b-rose-500 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-rose-500 tracking-tight block">
                  {metricas.rechazadas}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rechazadas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 mb-6 space-y-4">
          {/* Fila superior: Input de búsqueda + Select Estado + Select Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Input de Búsqueda */}
            <div className="md:col-span-6 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar cliente o propiedad"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193B7B]/20 focus:border-[#193B7B] transition"
              />
              {filtroTexto && (
                <button
                  onClick={() => setFiltroTexto('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <span className="text-xs bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center">✕</span>
                </button>
              )}
            </div>

            {/* Select Estado */}
            <div className="md:col-span-3 flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Estado</span>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  if (e.target.value === 'todos') setFiltroTab('todas');
                  else if (e.target.value === 'pendiente') setFiltroTab('pendientes');
                  else if (e.target.value === 'confirmada' || e.target.value === 'reprogramada') setFiltroTab('confirmadas');
                  else if (e.target.value === 'rechazada') setFiltroTab('rechazadas');
                }}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmada">Confirmadas</option>
                <option value="reprogramada">Reprogramadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>

            {/* Select Fecha */}
            <div className="md:col-span-3 flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Fecha</span>
              <div className="flex items-center gap-1.5 w-full">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <select
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="todas">Todas</option>
                  {fechasDisponibles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fila inferior: Botones Pills de filtro rápido */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setFiltroTab('todas');
                setFiltroEstado('todos');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtroTab === 'todas'
                  ? 'bg-[#193B7B] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas
            </button>

            <button
              onClick={() => {
                setFiltroTab('pendientes');
                setFiltroEstado('pendiente');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtroTab === 'pendientes'
                  ? 'bg-[#193B7B] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pendientes
            </button>

            <button
              onClick={() => {
                setFiltroTab('confirmadas');
                setFiltroEstado('confirmada');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtroTab === 'confirmadas'
                  ? 'bg-[#193B7B] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Confirmadas
            </button>

            <button
              onClick={() => {
                setFiltroTab('rechazadas');
                setFiltroEstado('rechazada');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtroTab === 'rechazadas'
                  ? 'bg-[#193B7B] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Rechazadas
            </button>

            {(filtroTexto || filtroEstado !== 'todos' || filtroFecha !== 'todas' || filtroTab !== 'todas') && (
              <button
                onClick={() => {
                  setFiltroTexto('');
                  setFiltroEstado('todos');
                  setFiltroTab('todas');
                  setFiltroFecha('todas');
                }}
                className="ml-auto text-xs text-slate-500 hover:text-slate-800 underline transition"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Layout principal en 2 columnas: Tabla a la izquierda, Próximas visitas a la derecha */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Tabla de Visitas (8 o 9 cols) */}
          <div className="xl:col-span-8 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 px-5 font-semibold">Cliente</th>
                    <th className="py-3.5 px-4 font-semibold">Propiedad</th>
                    <th className="py-3.5 px-4 font-semibold">Fecha y hora</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Acción principal</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Más acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visitasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-medium text-slate-600">No se encontraron visitas con los filtros aplicados</p>
                          <button
                            onClick={() => {
                              setFiltroTexto('');
                              setFiltroEstado('todos');
                              setFiltroTab('todas');
                              setFiltroFecha('todas');
                            }}
                            className="text-xs text-blue-600 hover:underline mt-1"
                          >
                            Restablecer filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visitasFiltradas.map((visita) => {
                      const avatarClass = getAvatarColorClass(visita.cliente.iniciales);

                      return (
                        <tr
                          key={visita.id}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => setVisitaDetalle(visita)}
                        >
                          {/* Columna Cliente */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarClass}`}
                              >
                                {visita.cliente.iniciales}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 block text-sm leading-tight">
                                  {visita.cliente.nombre}
                                </span>
                                <span className="text-xs text-slate-400 font-normal">
                                  {visita.cliente.telefono}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Columna Propiedad */}
                          <td className="py-4 px-4 font-medium text-slate-800 text-sm">
                            {visita.propiedad.titulo}
                          </td>

                          {/* Columna Fecha y hora */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800 block text-xs">
                              {visita.fecha}
                            </span>
                            <span className="text-xs text-slate-400">
                              {visita.horario}
                            </span>
                          </td>

                          {/* Columna Estado */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {visita.estado === 'pendiente' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pendiente
                              </span>
                            )}

                            {visita.estado === 'confirmada' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmada
                              </span>
                            )}

                            {visita.estado === 'reprogramada' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reprogramada
                              </span>
                            )}

                            {visita.estado === 'rechazada' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Rechazada
                              </span>
                            )}
                          </td>

                          {/* Columna Acción principal */}
                          <td className="py-4 px-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            {visita.estado === 'pendiente' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVisitaAAceptar(visita)}
                                  className="px-3.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition active:scale-95 shadow-sm"
                                >
                                  Aceptar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisitaARechazar(visita)}
                                  className="px-3.5 py-1.5 rounded-lg border border-rose-400 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition active:scale-95 shadow-sm"
                                >
                                  Rechazar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisitaAReprogramar(visita);
                                    setNuevaFecha(visita.fecha.includes('/') ? visita.fecha.split('/').reverse().join('-') : visita.fecha);
                                    setNuevoHorario(visita.horario.replace(' h', ''));
                                  }}
                                  className="px-4 py-1.5 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition active:scale-95 shadow-sm"
                                >
                                  Reprogramar
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Columna Más acciones (3 puntos verticales) */}
                          <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuAbiertoId(menuAbiertoId === visita.id ? null : visita.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {/* Dropdown flotante */}
                            {menuAbiertoId === visita.id && (
                              <div
                                className="absolute right-4 top-12 z-40 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 text-left text-xs font-medium text-slate-700 animate-in fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setVisitaDetalle(visita);
                                    setMenuAbiertoId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver detalles
                                </button>

                                <a
                                  href={getWhatsAppLink(visita)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-emerald-600"
                                >
                                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                                  </svg>
                                  Contactar por WhatsApp
                                </a>

                                <button
                                  onClick={() => {
                                    setVisitaAReprogramar(visita);
                                    setNuevaFecha(visita.fecha.includes('/') ? visita.fecha.split('/').reverse().join('-') : visita.fecha);
                                    setNuevoHorario(visita.horario.replace(' h', ''));
                                    setMenuAbiertoId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-blue-600"
                                >
                                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Reprogramar
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  onClick={() => handleEliminarVisita(visita.id, visita.cliente.nombre)}
                                  className="w-full px-4 py-2 hover:bg-rose-50 flex items-center gap-2.5 text-rose-600"
                                >
                                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna Derecha: Widget "Próximas visitas" */}
          <div className="xl:col-span-4 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
            <div>
              {/* Header del widget */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Próximas visitas
                </h2>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 mb-6 font-medium">
                Próximos 3 encuentros
              </p>

              {/* Lista de las próximas 3 visitas */}
              <div className="space-y-5">
                {proximasVisitas.map((visita, index) => {
                  // Colores de acento según la posición como en la captura
                  // Martina López: ámbar (10:30)
                  // Carla Méndez: verde (11:00)
                  // Federico Soria: azul (16:00)
                  const borderColors = [
                    'border-l-amber-400',
                    'border-l-emerald-500',
                    'border-l-blue-500',
                  ];
                  const borderColor = borderColors[index % borderColors.length];

                  return (
                    <div
                      key={visita.id}
                      onClick={() => setVisitaDetalle(visita)}
                      className={`flex items-start gap-4 pl-3.5 border-l-4 ${borderColor} py-1 cursor-pointer hover:bg-slate-50/80 rounded-r-xl transition`}
                    >
                      {/* Horario grande destacado */}
                      <div className="w-14 shrink-0 text-center">
                        <span className="text-sm font-extrabold text-slate-800 block leading-tight">
                          {visita.horario}
                        </span>
                      </div>

                      {/* Detalles de la cita */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {visita.cliente.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {visita.propiedad.titulo}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {visita.fecha}
                          </span>

                          {visita.estado === 'pendiente' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                              Pendiente
                            </span>
                          )}

                          {visita.estado === 'confirmada' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Confirmada
                            </span>
                          )}

                          {visita.estado === 'reprogramada' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Reprogramada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón inferior: Ver todas las visitas */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setFiltroTab('todas');
                  setFiltroEstado('todos');
                  setFiltroTexto('');
                  setFiltroFecha('todas');
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-[#193B7B] transition py-2 hover:bg-slate-50 rounded-xl"
              >
                Ver todas las visitas
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: ACEPTAR VISITA */}
      {visitaAAceptar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Confirmar visita
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              ¿Deseás confirmar el encuentro para <strong>{visitaAAceptar.cliente.nombre}</strong>?
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600 mb-5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Propiedad:</span>
                <span className="font-semibold text-slate-800">{visitaAAceptar.propiedad.titulo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y hora:</span>
                <span className="font-semibold text-slate-800">{visitaAAceptar.fecha} a las {visitaAAceptar.horario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teléfono:</span>
                <span className="font-semibold text-slate-800">{visitaAAceptar.cliente.telefono}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVisitaAAceptar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAceptarVisita(visitaAAceptar)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95"
              >
                Confirmar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECHAZAR VISITA */}
      {visitaARechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Rechazar solicitud de visita
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indique el motivo del rechazo para la visita de <strong>{visitaARechazar.cliente.nombre}</strong>.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Motivo del rechazo
              </label>
              <select
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Horario no disponible">Horario no disponible</option>
                <option value="Propiedad reservada con seña">Propiedad ya reservada</option>
                <option value="Propietario de viaje / sin llaves">Propietario sin disponibilidad</option>
                <option value="Sin respuesta al contacto telefónico">Sin respuesta del cliente</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVisitaARechazar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRechazo}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition active:scale-95"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPROGRAMAR VISITA */}
      {visitaAReprogramar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Reprogramar visita
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Cita con <strong>{visitaAReprogramar.cliente.nombre}</strong> para <em>{visitaAReprogramar.propiedad.titulo}</em>
            </p>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva fecha
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuevo horario
                </label>
                <input
                  type="time"
                  value={nuevoHorario}
                  onChange={(e) => setNuevoHorario(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nota / Motivo de cambio
                </label>
                <textarea
                  rows={2}
                  value={notaReprogramacion}
                  onChange={(e) => setNotaReprogramacion(e.target.value)}
                  placeholder="Ej: El cliente solicitó postergar 1 hora por viaje..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVisitaAReprogramar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReprogramacion}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#193B7B] hover:bg-[#122756] text-white shadow-sm transition active:scale-95"
              >
                Guardar reprogramación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALLE DE VISITA */}
      {visitaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColorClass(visitaDetalle.cliente.iniciales)}`}>
                  {visitaDetalle.cliente.iniciales}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {visitaDetalle.cliente.nombre}
                  </h3>
                  <span className="text-xs text-slate-400">{visitaDetalle.cliente.telefono}</span>
                </div>
              </div>
              <button
                onClick={() => setVisitaDetalle(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Propiedad:</span>
                  <span className="font-bold text-slate-800">{visitaDetalle.propiedad.titulo}</span>
                </div>
                {visitaDetalle.propiedad.direccion && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Dirección:</span>
                    <span className="text-slate-700">{visitaDetalle.propiedad.direccion}</span>
                  </div>
                )}
                {visitaDetalle.propiedad.precio && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Valor:</span>
                    <span className="font-semibold text-emerald-700">{visitaDetalle.propiedad.precio}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 font-medium">Fecha y hora:</span>
                  <span className="font-bold text-slate-900">{visitaDetalle.fecha} - {visitaDetalle.horario}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400 font-medium">Estado actual:</span>
                  <span className="font-bold capitalize">{visitaDetalle.estado}</span>
                </div>
              </div>

              {visitaDetalle.notaAdicional && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Notas de la visita:</span>
                  <p className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl text-slate-700 leading-relaxed">
                    {visitaDetalle.notaAdicional}
                  </p>
                </div>
              )}

              {visitaDetalle.motivoRechazo && (
                <div>
                  <span className="font-bold text-rose-700 block mb-1">Motivo de rechazo:</span>
                  <p className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-700 leading-relaxed">
                    {visitaDetalle.motivoRechazo}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <a
                href={getWhatsAppLink(visitaDetalle)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Abrir WhatsApp
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = visitaDetalle.id;
                    const nombre = visitaDetalle.cliente.nombre;
                    setVisitaDetalle(null);
                    handleEliminarVisita(id, nombre);
                  }}
                  className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setVisitaDetalle(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA VISITA */}
      {modalNuevaVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Agendar nueva visita
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Cargá los datos del interesado y el inmueble a visitar.
            </p>

            <form onSubmit={handleCrearNuevaVisita} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcelo Romero"
                    value={nuevaVisitaForm.nombre}
                    onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+54 9 343 ..."
                    value={nuevaVisitaForm.telefono}
                    onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Propiedad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Casa 3 dorm. Oro Verde o Dpto. 2 amb. Centro"
                  value={nuevaVisitaForm.propiedad}
                  onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, propiedad: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={nuevaVisitaForm.fecha}
                    onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, fecha: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horario *</label>
                  <input
                    type="time"
                    required
                    value={nuevaVisitaForm.horario.replace(' h', '')}
                    onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, horario: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nota adicional</label>
                <textarea
                  rows={2}
                  placeholder="Consultas particulares, condiciones, etc."
                  value={nuevaVisitaForm.nota}
                  onChange={(e) => setNuevaVisitaForm({ ...nuevaVisitaForm, nota: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNuevaVisita(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-[#193B7B] hover:bg-[#122756] text-white shadow-sm transition active:scale-95"
                >
                  Agendar visita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
