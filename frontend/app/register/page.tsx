'use client';

// frontend/app/registro/page.tsx
// Vista de Registro de Usuario (HU-05) - Diseno basado en Prototipo 14.1

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function RegistroPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validacion local previa
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setError('Por favor completa tu nombre y apellido.');
      return;
    }

    if (!formData.email.trim()) {
      setError('El correo electronico es obligatorio.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('El correo electronico no es valido.');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Registrar usuario e iniciar sesion automaticamente segun HU-05
      const user = await register({
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      // Redireccionar segun rol asignado
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo completar el registro. Intentalo nuevamente.');
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

        {/* Marca de agua vectorial de ciudad en sector izquierdo */}
        <svg
          className="absolute bottom-0 left-6 sm:left-12 w-[340px] sm:w-[420px] text-slate-200/60 opacity-60"
          viewBox="0 0 500 350"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Siluetas de edificios de fondo */}
          <rect x="20" y="80" width="70" height="270" fill="currentColor" fillOpacity="0.03" />
          <line x1="35" y1="110" x2="35" y2="280" strokeDasharray="4 4" />
          <line x1="55" y1="110" x2="55" y2="280" strokeDasharray="4 4" />
          <line x1="75" y1="110" x2="75" y2="280" strokeDasharray="4 4" />

          <rect x="100" y="30" width="85" height="320" fill="currentColor" fillOpacity="0.04" />
          <line x1="120" y1="60" x2="120" y2="300" strokeDasharray="4 4" />
          <line x1="145" y1="60" x2="145" y2="300" strokeDasharray="4 4" />
          <line x1="170" y1="60" x2="170" y2="300" strokeDasharray="4 4" />

          {/* Casa suburbana en primer plano */}
          <path d="M195 240 L280 170 L365 240 L365 350 L195 350 Z" fill="white" strokeWidth="2" />
          <path d="M185 240 L280 160 L375 240" strokeWidth="2.5" />
          <rect x="220" y="260" width="35" height="35" strokeWidth="1.5" />
          <line x1="237.5" y1="260" x2="237.5" y2="295" />
          <line x1="220" y1="277.5" x2="255" y2="277.5" />
          <rect x="290" y="270" width="55" height="80" strokeWidth="1.5" />
          <line x1="290" y1="290" x2="345" y2="290" />
          <line x1="290" y1="310" x2="345" y2="310" />
          <line x1="290" y1="330" x2="345" y2="330" />
        </svg>
      </div>

      {/* Tarjeta principal centrada */}
      <div className="relative z-10 w-full max-w-[490px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(10,25,61,0.12)] border border-slate-100/80 p-7 sm:p-9 my-8 animate-fade-in-up transition-all duration-500 ease-out">
        {/* Isotipo y nombre institucional */}
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8" viewBox="0 0 36 36" fill="none">
            {/* Techo azul */}
            <path d="M5 22L18 8L31 22" stroke="#0A193D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 12V6H29V15.5" stroke="#0A193D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Ventana de cuatro paneles rojos */}
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
        <div className="w-10 h-1 bg-[#cc1f26] rounded-full mt-3 mb-4" />

        {/* Titulo y subtitulo */}
        <h1 className="text-2xl sm:text-[28px] font-black text-[#0A193D] tracking-tight leading-tight">
          Crear cuenta
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 mt-1 mb-5">
          Registrate para agendar visitas y hacer consultas
        </p>

        {/* Mensaje de error amigable */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de registro */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Fila: Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Apellido
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Telefono */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+54 9 343 000 0000"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
              />
            </div>
          </div>

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
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nombre@email.com"
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimo 8 caracteres"
                required
                minLength={8}
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
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

          {/* Confirmar contrasena */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repetí tu contraseña"
                required
                minLength={8}
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A193D]/10 focus:border-[#0A193D] transition text-slate-800 placeholder:text-slate-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmPassword ? (
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

          {/* Boton Crear cuenta */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#cc1f26] hover:bg-[#b0171d] disabled:opacity-70 text-white py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-red-900/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Crear cuenta</span>
              </>
            )}
          </button>
        </form>

        {/* Divisor con la letra 'o' */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[11px] text-slate-400">o</span>
          </div>
        </div>

        {/* Enlace hacia inicio de sesion */}
        <p className="text-center text-xs text-slate-600">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[#0A193D] font-bold hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
