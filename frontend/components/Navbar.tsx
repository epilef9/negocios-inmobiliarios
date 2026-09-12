// frontend/components/Navbar.tsx
'use client';

import React, { useState } from 'react';
import Link from "next/link";
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <nav className="absolute top-0 left-0 w-full z-50 bg-black/15 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5">
            <span className="relative flex h-9 w-10 items-end justify-center border-b-[3px] border-white pb-0.5">
              <span className="absolute -top-1 h-6 w-6 rotate-45 border-l-[3.5px] border-t-[3.5px] border-white" />
              <span className="relative z-10 mb-0.5 grid h-3.5 w-3.5 grid-cols-2 gap-0.5 bg-red-600 p-0.5">
                <i className="bg-white/90" />
                <i className="bg-white/90" />
                <i className="bg-white/90" />
                <i className="bg-white/90" />
              </span>
            </span>
            <span className="text-xl font-bold text-white tracking-tight">
              Negocios <span className="text-red-500">Inmobiliarios</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-8 items-center">
            <Link href="/" className="text-white/80 hover:text-white font-medium transition-colors">Inicio</Link>
            <Link href="/propiedades" className="text-white/80 hover:text-white font-medium transition-colors">Ventas</Link>
            <Link href="/propiedades" className="text-white/80 hover:text-white font-medium transition-colors">Alquileres</Link>
            <Link href="/propiedades" className="text-white/80 hover:text-white font-medium transition-colors">Alquiler Temporario</Link>
            <Link href="/contacto" className="text-white/80 hover:text-white font-medium transition-colors">Contacto</Link>
            
            {user ? (
              <div className="flex items-center space-x-3">
                {user.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    className="bg-slate-800/80 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-all backdrop-blur-sm border border-white/20"
                  >
                    Panel Admin
                  </Link>
                )}
                
                {/* Nombre de usuario en cápsula destacada con bordes rojos */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-red-500/80 text-white text-xs font-semibold backdrop-blur-sm shadow-sm">
                  <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>
                    {user.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : user.email}
                  </span>
                </div>

                {/* Botón Cerrar Sesión en rojo corporativo pleno */}
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-sm shadow-red-600/30 active:scale-[0.98]"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-white/90 hover:text-white font-medium text-xs px-3 py-2 rounded-lg transition-colors border border-white/20 hover:bg-white/10"
                >
                  Ingresar
                </Link>
                <Link 
                  href="/register" 
                  className="bg-red-600/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-all backdrop-blur-sm border border-red-500/50 hover:shadow-lg hover:shadow-red-600/20 active:scale-[0.98]"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white/80 hover:text-white focus:outline-none transition-colors"
              aria-label="Menú móvil"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 absolute w-full animate-fade-in-down">
          <div className="px-4 pt-4 pb-6 space-y-3">
            <Link href="/" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">Inicio</Link>
            <Link href="/propiedades" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">Ventas</Link>
            <Link href="/propiedades" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">Alquileres</Link>
            <Link href="/propiedades" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">Alquiler Temporario</Link>
            <Link href="/contacto" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">Contacto</Link>
            
            {user ? (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-red-500/80 text-white text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{user.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : user.email}</span>
                </div>
                {user.role === 'admin' && (
                  <Link href="/admin" className="block w-full">
                    <button className="w-full text-center bg-slate-800 hover:bg-slate-700 text-white px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors border border-white/20">
                      Panel de Administración
                    </button>
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="w-full text-center bg-red-600 hover:bg-red-500 text-white px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors shadow-sm shadow-red-600/30"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <Link href="/login" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 font-medium rounded-md transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="block w-full">
                  <button className="w-full text-center bg-red-600 hover:bg-red-500 text-white px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors">
                    Registrarse
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}