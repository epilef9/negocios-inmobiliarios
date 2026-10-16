'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface AdminSidebarProps {
  activeSection?:
    | 'inicio'
    | 'propiedades'
    | 'catalogo'
    | 'visitas'
    | 'contratos'
    | 'clientes'
    | 'solicitudes'
    | 'configuracion';
}

interface AdminNavItem {
  id: NonNullable<AdminSidebarProps['activeSection']>;
  label: string;
  href: string;
  icon: ReactNode;
}

export default function AdminSidebar({ activeSection = 'inicio' }: AdminSidebarProps) {
  const { theme, currentPalette } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const navItems: AdminNavItem[] = [
    {
      id: 'inicio',
      label: 'Inicio / Bienvenida',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'propiedades',
      label: 'Propiedades',
      href: '/admin/propiedades',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'catalogo',
      label: 'Organizador Catálogo',
      href: '/admin/catalogo',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7m6-4l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
    },
    {
      id: 'visitas',
      label: 'Visitas',
      href: '/admin/visitas',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'contratos',
      label: 'Contratos',
      href: '/admin/contratos',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      href: '/admin/configuracion',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Botón hamburguesa flotante — visible siempre, posición fija */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? 'Contraer panel' : 'Expandir panel'}
        className="fixed top-4 left-4 z-50 w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ backgroundColor: currentPalette.primary }}
      >
        {/* Las tres rayitas se transforman en X cuando está abierto */}
        <span
          className="block h-[2px] w-5 bg-white rounded-full transition-all duration-300 origin-center"
          style={{
            transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'none',
          }}
        />
        <span
          className="block h-[2px] w-5 bg-white rounded-full transition-all duration-300"
          style={{ opacity: isOpen ? 0 : 1, transform: isOpen ? 'scaleX(0)' : 'scaleX(1)' }}
        />
        <span
          className="block h-[2px] w-5 bg-white rounded-full transition-all duration-300 origin-center"
          style={{
            transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
          }}
        />
      </button>

      {/* Sidebar con animación de deslizamiento */}
      <aside
        className="flex flex-col shrink-0 border-r transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: isOpen ? '256px' : '0px',
          minWidth: isOpen ? '256px' : '0px',
          opacity: isOpen ? 1 : 0,
          backgroundColor: currentPalette.primary,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          visibility: isOpen ? 'visible' : 'hidden',
        }}
      >
        {/* Encabezado Logo y Título — con padding izquierdo extra para no chocar con el botón */}
        <div className="pl-14 pr-5 pt-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="relative flex h-8 w-9 items-end justify-center border-b-[2.5px] border-white pb-0.5">
              <span className="absolute -top-1 h-5 w-5 rotate-45 border-l-[2.5px] border-t-[2.5px] border-white" />
              <span
                className="relative z-10 mb-0.5 grid h-3 w-3 grid-cols-2 gap-0.5 p-0.5"
                style={{ backgroundColor: currentPalette.accent }}
              >
                <i className="bg-white" />
                <i className="bg-white" />
                <i className="bg-white" />
                <i className="bg-white" />
              </span>
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight whitespace-nowrap">
                Negocios Inm.
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-300">Panel Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.25)`,
                        borderLeft: `4px solid ${currentPalette.accent}`,
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: isActive ? currentPalette.accent : '#94a3b8' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer con usuario y enlaces */}
        <div className="p-3.5 border-t border-white/10 space-y-2.5 bg-black/25">
          <div className="px-2 py-1.5 rounded-lg bg-white/5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-bold text-white truncate">
                {user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : user?.email || 'Administrador'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                Modo {theme}
              </p>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentPalette.accent }}
              title={`Paleta: ${currentPalette.name}`}
            />
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <Link
              href="/propiedades"
              className="flex-1 text-center py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap overflow-hidden"
            >
              Ver Catálogo
            </Link>
            <button
              type="button"
              onClick={logout}
              className="py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-300 hover:text-red-200 transition-colors"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
