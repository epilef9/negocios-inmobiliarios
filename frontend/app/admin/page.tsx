'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getProperties, type ApiProperty } from '../../services/api';
import { getVisitas, type Visita } from '../../services/visitas';
import { getContratos, type Contrato } from '../../services/contratos';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { theme, currentPalette } = useTheme();

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Formatear hora y fecha local
    const updateDate = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateDate();

    // Cargar datos reales para contadores
    Promise.all([
      getProperties().catch(() => []),
      getVisitas().catch(() => []),
      getContratos().catch(() => []),
    ]).then(([propsData, visitasData, contratosData]) => {
      setProperties(propsData || []);
      setVisitas(visitasData || []);
      setContratos(contratosData || []);
      setLoading(false);
    });
  }, []);

  const adminName = user?.nombre
    ? `${user.nombre} ${user.apellido || ''}`.trim()
    : user?.email?.split('@')[0] || 'Administrador';

  const pendingVisitsCount = visitas.filter(
    (v) => (v.estado as string)?.toLowerCase() === 'pendiente'
  ).length;

  const activeContractsCount = contratos.filter(
    (c) => (c.estado as string)?.toLowerCase() === 'activo'
  ).length;

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-[#090e1a] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <AdminSidebar activeSection="inicio" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Banner Superior de Bienvenida con Gradiente Dinámico */}
        <header
          className="relative overflow-hidden px-8 py-10 shadow-lg text-white"
          style={{
            background: `linear-gradient(135deg, ${currentPalette.primary} 0%, #0d1b3e 60%, ${currentPalette.accent} 160%)`,
          }}
        >
          {/* Formas geométricas sutiles de fondo */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute right-32 -bottom-10 w-64 h-64 rounded-full bg-white/5 blur-xl pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/80 font-medium capitalize">{currentTime}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                ¡Hola de nuevo, <span style={{ color: currentPalette.accent === '#CC1F26' ? '#ff9b9b' : currentPalette.accent }}>{adminName}</span>! 👋
              </h1>
              <p className="mt-2 text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
                Bienvenido al centro de administración de Negocios Inmobiliarios. Seleccioná una de las opciones para gestionar tu negocio o personalizar la plataforma.
              </p>
            </div>

            {/* Accesos rápidos de cabecera */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/propiedades"
                className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver Sitio Público
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
          {/* Métricas Rápidas (KPI Cards) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Propiedades */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:shadow-md ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Propiedades
                </span>
                <span
                  className="p-2 rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : properties.length}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">en catálogo</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <Link href="/admin/propiedades" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                  Ver inventario →
                </Link>
                <Link href="/admin/propiedades/nueva" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium">
                  + Agregar
                </Link>
              </div>
            </div>

            {/* KPI 2: Visitas */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:shadow-md ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Visitas & Citas
                </span>
                <span
                  className="p-2 rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: currentPalette.accent }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : visitas.length}</span>
                {pendingVisitsCount > 0 ? (
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                    {pendingVisitsCount} pendientes
                  </span>
                ) : (
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">al día</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <Link href="/admin/visitas" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                  Gestionar citas →
                </Link>
              </div>
            </div>

            {/* KPI 3: Contratos */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:shadow-md ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Contratos
                </span>
                <span className="p-2 rounded-xl text-white bg-indigo-600 shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : contratos.length}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  {activeContractsCount} activos
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <Link href="/admin/contratos" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                  Ver contratos →
                </Link>
                <Link href="/admin/contratos/generar" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium">
                  + Generar
                </Link>
              </div>
            </div>

            {/* KPI 4: Tema y Estilos Activos (Solo Informativo, Sin Botón Redundante) */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:shadow-md ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Identidad Visual
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-white/60 shadow-sm shrink-0"
                  style={{ backgroundColor: currentPalette.accent }}
                />
                <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{currentPalette.name}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Desde Configuración</span>
                <Link href="/admin/configuracion" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                  Ajustes →
                </Link>
              </div>
            </div>
          </section>

          {/* Módulos Principales (El Hub de Bienvenida solicitado) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">¿Qué querés gestionar hoy?</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Accesos directos a todos los módulos y herramientas del administrador.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Opción 1: Organizador de Catálogo (Novedad solicitada) */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: currentPalette.accent }}
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7m6-4l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: currentPalette.accent }}
                    >
                      Prioridad Visual
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Organizador de Catálogo
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Elegí exactamente cuál propiedad aparece primero, cuál segunda y cuáles destacar en la portada que ven los clientes.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href="/admin/catalogo"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:opacity-95 active:scale-98"
                    style={{ backgroundColor: currentPalette.accent }}
                  >
                    Abrir Organizador →
                  </Link>
                </div>
              </div>

              {/* Opción 2: Gestión de Propiedades */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: currentPalette.primary }}
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {properties.length} inmuebles
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Inventario de Propiedades
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cargar nuevos inmuebles, editar información, fotos en alta resolución, valores en USD/ARS y ubicaciones en el mapa.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Link
                    href="/admin/propiedades"
                    className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all"
                  >
                    Ver Lista
                  </Link>
                  <Link
                    href="/admin/propiedades/nueva"
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    + Nueva
                  </Link>
                </div>
              </div>

              {/* Opción 3: Visitas y Citas */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-blue-600 shadow-md">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {pendingVisitsCount > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {pendingVisitsCount} pendientes
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Visitas & Citas
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Monitoreá las solicitudes de los clientes, confirmá fechas, reprogramá horarios o anotá notas de seguimiento.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/admin/visitas"
                    className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
                  >
                    Ir a Visitas →
                  </Link>
                </div>
              </div>

              {/* Opción 4: Contratos & Documentación */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-indigo-600 shadow-md">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {contratos.length} generados
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Contratos & Legal
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Confección de contratos de alquiler, venta temporaria o comercial con cláusulas editables y vista previa formal.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Link
                    href="/admin/contratos"
                    className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md"
                  >
                    Ver Contratos
                  </Link>
                  <Link
                    href="/admin/contratos/generar"
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    + Generar
                  </Link>
                </div>
              </div>

              {/* Opción 5: Configuración y Estilos de Marca */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-slate-800 dark:bg-slate-700 shadow-md">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Personalización
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Configuración & Estilos
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Alterná entre Modo Oscuro y Modo Claro, elegí los colores corporativos de la empresa y ajustá datos de contacto.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/admin/configuracion"
                    className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-md"
                  >
                    Personalizar Panel →
                  </Link>
                </div>
              </div>

              {/* Opción 6: Ver y Editar desde la vista del Cliente */}
              <div
                className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-emerald-600 shadow-md">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Vista en Vivo
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
                      Navegar Catálogo Público
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Explorá la web con tu sesión de administrador activa. Podrás ver la barra de edición y reordenar directamente en la vista cliente.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/propiedades"
                    className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md"
                  >
                    Explorar como Cliente →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Sección de Resumen de Visitas Inmediatas */}
          {visitas.length > 0 && (
            <section
              className={`p-6 rounded-3xl border transition-all ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="text-base font-bold">Últimas Solicitudes de Visita</h3>
                </div>
                <Link href="/admin/visitas" className="text-xs text-blue-500 hover:underline font-semibold">
                  Ver todas las visitas ({visitas.length}) →
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {visitas.slice(0, 3).map((v) => (
                  <div key={v.id || v._id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{v.cliente?.nombre || 'Cliente interesado'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Propiedad: <span className="font-medium text-slate-700 dark:text-slate-300">{v.propiedad?.titulo || 'Inmueble'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">
                        {v.fecha} {v.horario ? `• ${v.horario}` : ''}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          v.estado === 'confirmada'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : v.estado === 'pendiente'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {v.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
