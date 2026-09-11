// frontend/components/Navbar.tsx
'use client';

import React, { useState } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

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
          <div className="hidden lg:flex space-x-7 items-center text-sm font-semibold">
            <Link
              href="/"
              className={`transition-colors py-1 ${isActive('/') ? 'text-white border-b-2 border-red-500 font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Inicio
            </Link>
            <Link
              href="/propiedades"
              className={`transition-colors py-1 ${isActive('/propiedades') ? 'text-white border-b-2 border-red-500 font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Propiedades
            </Link>
            <Link
              href="/requisitos"
              className={`transition-colors py-1 ${isActive('/requisitos') ? 'text-white border-b-2 border-red-500 font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Requisitos
            </Link>
            <Link
              href="/contacto"
              className={`transition-colors py-1 ${isActive('/contacto') ? 'text-white border-b-2 border-red-500 font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Contacto
            </Link>
            <Link 
              href="/admin" 
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm border border-red-500/50 hover:shadow-red-600/20 active:scale-[0.98] flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Ingresar
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
        <div className="lg:hidden bg-[#092454]/95 backdrop-blur-xl border-b border-white/10 absolute w-full animate-fade-in-down shadow-xl">
          <div className="px-4 pt-4 pb-6 space-y-3 text-sm">
            <Link href="/" className={`block px-3 py-2 rounded-md font-medium ${isActive('/') ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Inicio
            </Link>
            <Link href="/propiedades" className={`block px-3 py-2 rounded-md font-medium ${isActive('/propiedades') ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Propiedades
            </Link>
            <Link href="/requisitos" className={`block px-3 py-2 rounded-md font-medium ${isActive('/requisitos') ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Requisitos
            </Link>
            <Link href="/contacto" className={`block px-3 py-2 rounded-md font-medium ${isActive('/contacto') ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Contacto
            </Link>
            <Link href="/admin" className="block w-full pt-2">
              <button className="w-full text-center bg-red-600 hover:bg-red-500 text-white px-3 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
                Ingresar al Panel
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}