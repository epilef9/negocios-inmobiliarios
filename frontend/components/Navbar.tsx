// frontend/components/Navbar.tsx
'use client';

import React, { useState } from 'react';
import Link from "next/link";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="absolute top-0 left-0 w-full z-50 bg-black/10 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold text-white tracking-tight">
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
            <Link 
              href="/admin" 
              className="bg-red-600/90 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-all backdrop-blur-sm border border-red-500/50 hover:shadow-lg hover:shadow-red-600/20 active:scale-[0.98]"
            >
              Panel Admin
            </Link>
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
            <Link href="/admin" className="block w-full pt-2">
              <button className="w-full text-center bg-red-600 hover:bg-red-500 text-white px-3 py-3 rounded-lg font-semibold transition-colors">
                Panel de Administración
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}