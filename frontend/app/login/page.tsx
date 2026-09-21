'use client';

// frontend/app/login/page.tsx
// Vista de Inicio de Sesion (HU-09) - Diseno basado en Prototipo 14.2

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contrasena.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('El correo electronico no es valido.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Iniciar sesion
      const user = await login({
        email: email.trim(),
        password: password.trim(),
      });

      // Redireccionar segun rol
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales invalidas. Por favor verifica tus datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-white">
      {/* Boton rojo para volver a la pagina de inicio */}
      <Link
        href="/"
        className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full bg-[#cc1f26] hover:bg-[#b0171d] text-white flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer border border-white/20"
        title="Volver al inicio"
        aria-label="Volver al inicio"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      {/* Fondo geometrico decorativo segun prototipo */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Bloque diagonal azul marino en lateral derecho */}
        <div
          className="absolute top-0 right-0 h-full w-[45%] lg:w-[40%] bg-[#0A193D]"
          style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 0% 100%)' }}
        />

        {/* Franja diagonal roja institucional contigua */}
        <div
          className="absolute top-0 right-0 h-full w-[46%] lg:w-[41%] bg-[#cc1f26] -z-10"
          style={{ clipPath: 'polygon(32% 0, 100% 0, 100% 100%, 0% 100%)' }}
        />

        {/* Cuna triangular roja inferior izquierda */}
        <div
          className="absolute bottom-0 left-0 w-36 h-28 bg-[#cc1f26]"
          style={{ clipPath: 'polygon(0 40%, 100% 100%, 0 100%)' }}
        />

        {/* Cuna azul inferior izquierda */}
        <div
          className="absolute bottom-0 left-0 w-24 h-20 bg-[#0A193D]"
          style={{ clipPath: 'polygon(0 60%, 100% 100%, 0 100%)' }}
        />

        {/* Marca de agua vectorial en sector izquierdo */}
        <svg
          className="absolute bottom-0 left-6 sm:left-12 w-[340px] sm:w-[420px] text-slate-200/60 opacity-60"
          viewBox="0 0 500 350"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="20" y="80" width="70" height="270" fill="currentColor" fillOpacity="0.03" />
          <rect x="100" y="30" width="85" height="320" fill="currentColor" fillOpacity="0.04" />
        </svg>
      </div>

      {/* Tarjeta principal con estructura de dos columnas segun prototipo 14.2 */}
      <div className="relative z-10 w-full max-w-[840px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(10,25,61,0.12)] border border-slate-100/80 p-8 sm:p-12 my-8 animate-fade-in-up transition-all duration-500 ease-out">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Columna Izquierda: Identidad visual, bienvenida e ilustracion */}
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Isotipo y nombre institucional */}
              <div className="flex items-center gap-2.5">
                <svg className="w-8 h-8" viewBox="0 0 36 36" fill="none">
                  <path d="M5 22L18 8L31 22" stroke="#0A193D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M26 12V6H29V15.5" stroke="#0A193D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="13.5" y="16" width="4" height="4" fill="#cc1f26" rx="0.5" />
                  <rect x="18.5" y="16" width="4" height="4" fill="#cc1f26" rx="0.5" />
                  <rect x="13.5" y="21" width="4" height="4" fill="#cc1f26" rx="0.5" />
                  <rect x="18.5" y="21" width="4" height="4" fill="#cc1f26" rx="0.5" />
                </svg>
                <div>
                  <span className="block text-sm font-black tracking-tight text-[#0A193D] leading-none">
                    NEGOCIOS
                  </span>
                  <span className="block text-[10px] font-bold tracking-widest text-[#cc1f26] leading-tight">
                    INMOBILIARIOS
                  </span>
                </div>
              </div>

              {/* Barra roja indicadora */}
              <div className="w-10 h-1 bg-[#cc1f26] rounded-full mt-3 mb-5" />

              {/* Titulo con acento de color segun prototipo */}
              <h1 className="text-3xl sm:text-[34px] font-black tracking-tight leading-tight text-[#0A193D]">
                Bienvenido <br />
                <span className="text-[#cc1f26]">de nuevo</span>
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 mt-2 mb-6">
                Ingresá tus datos para acceder a tu cuenta
              </p>
            </div>

            {/* Ilustracion lineal de casa (arte vectorial exacto del prototipo) */}
            <div className="pt-2">
              <svg className="w-full max-w-[260px] text-[#0A193D]/25" viewBox="0 0 260 160" fill="none" stroke="currentColor">
                {/* Estructura de la casa */}
                <path d="M20 140 L20 70 L90 25 L160 70 L160 140 Z" strokeWidth="2" />
                <path d="M12 72 L90 20 L168 72" strokeWidth="2.5" strokeLinecap="round" />
                {/* Chimenea */}
                <path d="M130 40 L130 25 L145 25 L145 50" strokeWidth="2" />
                {/* Garaje lateral */}
                <path d="M160 80 L235 80 L235 140 L160 140" strokeWidth="2" />
                <path d="M155 80 L240 80" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="175" y="95" width="45" height="45" strokeWidth="1.5" />
                <line x1="175" y1="108" x2="220" y2="108" strokeWidth="1" />
                <line x1="175" y1="120" x2="220" y2="120" strokeWidth="1" />
                <line x1="175" y1="132" x2="220" y2="132" strokeWidth="1" />
                {/* Ventana redonda superior */}
                <circle cx="90" cy="55" r="10" strokeWidth="1.5" />
                <line x1="90" y1="45" x2="90" y2="65" strokeWidth="1" />
                <line x1="80" y1="55" x2="100" y2="55" strokeWidth="1" />
                {/* Ventana inferior */}
                <rect x="40" y="85" width="30" height="30" strokeWidth="1.5" />
                <line x1="55" y1="85" x2="55" y2="115" strokeWidth="1" />
                <line x1="40" y1="100" x2="70" y2="100" strokeWidth="1" />
                {/* Puerta principal */}
                <rect x="95" y="95" width="25" height="45" strokeWidth="1.8" />
                <circle cx="114" cy="118" r="1.5" fill="currentColor" />
                {/* Suelo y camino */}
                <line x1="5" y1="140" x2="250" y2="140" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Login */}
          <div>
            {/* Mensaje de error amigable */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Correo electronico */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="nombre@email.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
                  />
                </div>
              </div>

              {/* Contrasena */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Enlace Olvidaste tu contrasena */}
              <div className="text-right -mt-1">
                <a href="#" className="text-[11px] font-medium text-slate-500 hover:text-[#0A193D] transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Boton Ingresar */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1 bg-[#cc1f26] hover:bg-[#b0171d] disabled:opacity-70 text-white py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-red-900/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Ingresar</span>
                )}
              </button>
            </form>

            {/* Divisor con la letra 'o' */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] text-slate-400">o</span>
              </div>
            </div>

            {/* Enlace hacia registro */}
            <p className="text-center text-xs text-slate-600">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="text-[#0A193D] font-bold hover:underline">
                Registrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
