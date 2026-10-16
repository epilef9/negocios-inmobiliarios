'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../../components/AdminSidebar';
import { useTheme, type PaletteId } from '../../../context/ThemeContext';

export default function AdminConfiguracionPage() {
  const { theme, setTheme, palette, setPalette, currentPalette, palettes } = useTheme();

  // Estados de datos de la empresa guardados en localStorage
  const [companyName, setCompanyName] = useState('Negocios Inmobiliarios');
  const [whatsappNumber, setWhatsappNumber] = useState('+54 9 343 4449922');
  const [contactEmail, setContactEmail] = useState('contacto@negociosinmobiliarios.com');
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'ARS'>('USD');
  const [enableAdminBar, setEnableAdminBar] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('inm_company_name');
      const savedPhone = localStorage.getItem('inm_whatsapp_number');
      const savedEmail = localStorage.getItem('inm_contact_email');
      const savedCurrency = localStorage.getItem('inm_default_currency') as 'USD' | 'ARS' | null;
      const savedBar = localStorage.getItem('inm_admin_bar');

      if (savedName) setCompanyName(savedName);
      if (savedPhone) setWhatsappNumber(savedPhone);
      if (savedEmail) setContactEmail(savedEmail);
      if (savedCurrency) setDefaultCurrency(savedCurrency);
      if (savedBar !== null) setEnableAdminBar(savedBar === 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('inm_company_name', companyName);
      localStorage.setItem('inm_whatsapp_number', whatsappNumber);
      localStorage.setItem('inm_contact_email', contactEmail);
      localStorage.setItem('inm_default_currency', defaultCurrency);
      localStorage.setItem('inm_admin_bar', String(enableAdminBar));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch {
      // ignore
    }
  };

  const handleResetDefaults = () => {
    setTheme('light');
    setPalette('corporativo');
    setCompanyName('Negocios Inmobiliarios');
    setWhatsappNumber('+54 9 343 4449922');
    setContactEmail('contacto@negociosinmobiliarios.com');
    setDefaultCurrency('USD');
    setEnableAdminBar(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-[#090e1a] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <AdminSidebar activeSection="configuracion" />

      <main className="flex-1 min-w-0 p-6 sm:p-10 overflow-y-auto">
        {/* Toast Notificación */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-fade-in-up border border-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-bold">¡Configuración y estilos guardados con éxito!</span>
          </div>
        )}

        <div className="max-w-5xl mx-auto space-y-10">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-300 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-900 dark:text-slate-300">
                  Panel de Administración
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: currentPalette.accent }}
                >
                  Personalización
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
                Configuración & Estilos
              </h1>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-medium">
                Personalizá la estética general, alterná el modo oscuro y definí las opciones visuales del catálogo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Restablecer
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                style={{ backgroundColor: currentPalette.accent }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Cambios
              </button>
            </div>
          </div>

          {/* SECCIÓN 1: ACCESO DIRECTO AL ORGANIZADOR DE CATÁLOGO */}
          <section
            className="p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all"
            style={{
              background:
                theme === 'dark'
                  ? `linear-gradient(135deg, ${currentPalette.primary}33 0%, #0f172a 100%)`
                  : `linear-gradient(135deg, ${currentPalette.accentSoft} 0%, #ffffff 100%)`,
              borderColor: currentPalette.accent,
            }}
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: currentPalette.accent }}
                >
                  Gestión del Catálogo
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Organizador Visual de Propiedades
                </h2>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  ¿Querés acomodar cuál propiedad va primero, cuál segunda y cuáles destacar?
                  Accedé a la pantalla de organización para reordenar el catálogo tal como lo ven tus clientes con controles dedicados.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/admin/catalogo"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: currentPalette.accent }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7m6-4l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Abrir Organizador de Catálogo
                </Link>
                <Link
                  href="/propiedades"
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-center transition shadow-2xs"
                >
                  Ver Catálogo Público
                </Link>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: PERSONALIZACIÓN DE ESTILOS (MODO OSCURO / CLARO) */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">1. Modo de Apariencia</h2>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                Seleccioná el modo visual para trabajar en el panel administrativo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Opción Claro */}
              <div
                onClick={() => setTheme('light')}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-blue-600 bg-white shadow-md ring-4 ring-blue-500/10'
                    : 'border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      ☀️
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Modo Claro</h3>
                    </div>
                  </div>
                  {theme === 'light' && (
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      ✓
                    </span>
                  )}
                </div>

                {/* Vista previa miniatura */}
                <div className="rounded-xl border border-slate-300 p-3 bg-white text-[10px] text-slate-900 font-bold space-y-1.5 pointer-events-none shadow-2xs">
                  <div className="h-2 w-1/3 bg-slate-400 rounded" />
                  <div className="h-4 w-full bg-slate-50 rounded border border-slate-200 flex items-center px-2 text-slate-900 font-bold">
                    Contenido con fondo claro
                  </div>
                </div>
              </div>

              {/* Opción Oscuro */}
              <div
                onClick={() => setTheme('dark')}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-[#0f172a] shadow-md ring-4 ring-blue-500/10 text-white'
                    : 'border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold">
                      🌙
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Modo Oscuro</h3>
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      ✓
                    </span>
                  )}
                </div>

                {/* Vista previa miniatura */}
                <div className="rounded-xl border border-slate-700/60 p-3 bg-[#050b18] text-[10px] text-slate-200 space-y-1.5 pointer-events-none">
                  <div className="h-2 w-1/3 bg-slate-600 rounded" />
                  <div className="h-4 w-full bg-[#111c35] rounded border border-slate-700 flex items-center px-2 font-medium">
                    Contenido con fondo oscuro
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: PALETAS DE COLORES DE LA EMPRESA */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">2. Colores Corporativos</h2>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                Elegí la identidad cromática de la inmobiliaria. Se aplica a barras, botones y elementos destacados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {palettes.map((p) => {
                const isSelected = palette === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPalette(p.id as PaletteId)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 shadow-lg ring-2 ring-blue-500/20 scale-[1.02]'
                        : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 hover:scale-[1.01]'
                    } ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}`}
                  >
                    <div>
                      {/* Swatch de colores */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-xl shadow-md border border-white/20"
                            style={{ backgroundColor: p.primary }}
                            title="Color Primario"
                          />
                          <span
                            className="w-7 h-7 rounded-xl shadow-md border border-white/20"
                            style={{ backgroundColor: p.accent }}
                            title="Color de Acento"
                          />
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            Activo
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{p.name}</h3>
                    </div>

                    {/* Botón de muestra */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div
                        className="w-full py-1.5 px-3 rounded-lg text-center text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: p.accent }}
                      >
                        Aplicar Paleta
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN 4: PARÁMETROS GENERALES Y OPCIONES DE CATÁLOGO */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">3. Parámetros del Negocio & Navegación</h2>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Información de contacto oficial y comportamiento de la vista de cliente.
              </p>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className={`p-6 rounded-3xl border ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              } space-y-6`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                    Nombre Comercial de la Inmobiliaria
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="Negocios Inmobiliarios"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                    Moneda Principal Predeterminada
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value as 'USD' | 'ARS')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="USD">USD (Dólares estadounidenses)</option>
                    <option value="ARS">ARS (Pesos argentinos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                    WhatsApp para Consultas de Inmuebles
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="+54 9 343 4449922"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                    Email de Recepción de Solicitudes
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="contacto@negociosinmobiliarios.com"
                  />
                </div>
              </div>

              {/* Switch de Barra Flotante de Administrador */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Barra de Administrador en Vista Cliente</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Muestra una barra flotante en el catálogo público que te permite reordenar propiedades directamente como cliente.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAdminBar}
                    onChange={(e) => setEnableAdminBar(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: currentPalette.accent }}
                >
                  Guardar Configuración
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
