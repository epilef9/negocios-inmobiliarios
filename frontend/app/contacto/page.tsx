// frontend/app/contacto/page.tsx
'use client';

import React, { useState } from 'react';
import Navbar from "@/components/Navbar";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    mensaje: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.email.trim() || !formData.mensaje.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#141A2B] font-sans flex flex-col selection:bg-[#D9382B] selection:text-white">

      {/* ========================================================================= */}
      {/* 1. NAVBAR COMPARTIDA                                                      */}
      {/* ========================================================================= */}
      <Navbar />

      {/* ========================================================================= */}
      {/* 2. FRANJA HERO                                                            */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-[#10265A] text-white pt-28 sm:pt-32 pb-[60px] overflow-hidden">

        {/* Detalle decorativo: Línea quebrada tipo 'gráfico de acciones' fina */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-50 z-0 overflow-hidden w-64 sm:w-96 h-36">
          <svg
            className="w-full h-full"
            viewBox="0 0 360 120"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,95 L40,82 L80,90 L120,62 L160,75 L200,48 L240,58 L280,25 L320,38 L360,8"
              stroke="#3A5A4C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M0,110 L45,102 L90,108 L135,88 L180,96 L225,76 L270,82 L315,55 L360,40"
              stroke="#3A5A4C"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8">
          {/* Kicker */}
          <span className="block text-[#D9382B] text-xs font-bold tracking-[0.2em] uppercase mb-3">
            CONTACTO
          </span>

          {/* H1 con la tipografía limpia de la home */}
          <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-bold leading-tight text-white max-w-[540px] tracking-tight">
            Encontremos juntos tu próxima propiedad en Libertador San Martin
          </h1>

          {/* Párrafo debajo */}
          <p className="mt-3.5 text-[#C7D3CB] text-base leading-relaxed max-w-[460px]">
            Escribinos por WhatsApp o dejanos tu consulta.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECCIÓN FORMULARIO (EN EL MEDIO)                                       */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* Contenedor centralizado del formulario */}
        <section className="w-full max-w-2xl mx-auto bg-white/60 sm:bg-white rounded-2xl sm:border sm:border-[#E1E4EA] p-6 sm:p-10">

          {/* Encabezado del Formulario */}
          <div className="mb-8">
            <span className="text-[#D9382B] text-xs font-bold tracking-[0.16em] uppercase block mb-1">
              FORMULARIO DIRECTO
            </span>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#141A2B] tracking-tight">
              Envianos una consulta
            </h2>
            <p className="text-[#69707F] text-sm sm:text-base mt-1.5">
              Completá el formulario y te respondemos a la brevedad.
            </p>
          </div>

          {/* Formulario */}
          {submitted ? (
            <div className="bg-[#EBEEF6] rounded-[18px] p-8 border border-[#D7DFEE] text-center">
              <div className="w-12 h-12 rounded-full bg-[#10265A] text-white flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-[20px] text-[#10265A] mb-2">
                ¡Mensaje enviado con éxito!
              </h3>
              <p className="text-[#69707F] text-sm max-w-md mx-auto mb-6">
                Muchas gracias por contactarte, <span className="font-semibold text-[#141A2B]">{formData.nombre}</span>. Araceli se comunicará con vos en menos de una hora.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ nombre: '', email: '', mensaje: '' });
                }}
                className="rounded-full border border-[#141A2B] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#141A2B] hover:bg-[#141A2B] hover:text-white transition-colors"
              >
                Enviar otra consulta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Fila de dos campos lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Nombre completo */}
                <div className="flex flex-col">
                  <label
                    htmlFor="nombre"
                    className="text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1.5"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    required
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-transparent border-0 border-b border-[#E1E4EA] py-2.5 text-[#141A2B] text-base placeholder-[#69707F]/60 focus:border-[#10265A] focus:outline-none transition-colors rounded-none"
                  />
                </div>

                {/* Correo electrónico */}
                <div className="flex flex-col">
                  <label
                    htmlFor="email"
                    className="text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1.5"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="nombre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-0 border-b border-[#E1E4EA] py-2.5 text-[#141A2B] text-base placeholder-[#69707F]/60 focus:border-[#10265A] focus:outline-none transition-colors rounded-none"
                  />
                </div>
              </div>

              {/* Campo Mensaje */}
              <div className="flex flex-col pt-1">
                <label
                  htmlFor="mensaje"
                  className="text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1.5"
                >
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  required
                  rows={4}
                  placeholder="Contanos en qué te podemos ayudar..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-[#E1E4EA] py-2.5 text-[#141A2B] text-base placeholder-[#69707F]/60 focus:border-[#10265A] focus:outline-none transition-colors resize-y rounded-none"
                />
              </div>

              {/* Pie del formulario */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#F0F2F5]">
                <p className="text-[#69707F] text-xs leading-relaxed max-w-xs">
                  Tu consulta es muy importante para nosotros. Te responderemos a la brevedad.
                </p>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-[#D9382B] px-8 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] flex-shrink-0"
                >
                  Enviar consulta
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ======================================================================= */}
        {/* 4. DIVISOR HORIZONTAL                                                   */}
        {/* ======================================================================= */}
        <hr className="border-t border-[#E1E4EA] my-14 sm:my-16" />

        {/* ======================================================================= */}
        {/* 5. SECCIÓN INFORMACIÓN DE CONTACTO + UBICACIÓN (ABAJO)                  */}
        {/* ======================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-[56px] items-start">

          {/* --------------------------------------------------------------------- */}
          {/* Columna Izquierda: Información de contacto                            */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex flex-col">

            {/* Label de sección */}
            <span className="text-[#D9382B] text-xs font-bold tracking-[0.16em] uppercase mb-6">
              INFORMACIÓN DE CONTACTO
            </span>

            {/* Fila de agente */}
            <div className="flex items-center gap-4 mb-8">
              {/* Avatar circular 52px con iniciales 'AB' */}
              <div className="w-[52px] h-[52px] rounded-full bg-[#EBEEF6] flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-lg text-[#10265A]">
                  AB
                </span>
              </div>
              <div>
                <h3 className="font-bold text-[19px] text-[#141A2B] leading-snug">
                  Araceli Balbuena
                </h3>
                <p className="text-[#69707F] text-[13px] font-normal">
                  Negocios Inmobiliarios
                </p>
              </div>
            </div>

            {/* Lista de datos con borde superior y separadores horizontales */}
            <div className="border-t border-[#E1E4EA] divide-y divide-[#E1E4EA]">

              {/* Teléfono */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline">
                <span className="w-[110px] text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1 sm:mb-0 flex-shrink-0">
                  Teléfono
                </span>
                <a
                  href="https://wa.me/543434469522"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#141A2B] text-sm sm:text-[15px] font-medium hover:text-[#D9382B] transition-colors"
                >
                  +54 343 446 9522
                </a>
              </div>

              {/* Email */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline">
                <span className="w-[110px] text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1 sm:mb-0 flex-shrink-0">
                  Email
                </span>
                <a
                  href="mailto:puiggarinegociosinmobiliarios@hotmail.com"
                  className="text-[#141A2B] text-sm sm:text-[15px] font-medium hover:text-[#D9382B] transition-colors break-all"
                >
                  puiggarinegociosinmobiliarios@hotmail.com
                </a>
              </div>

              {/* Horario */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-start">
                <span className="w-[110px] text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-2 sm:mb-0 flex-shrink-0 pt-0.5">
                  Horario
                </span>
                <div className="space-y-1.5 text-sm sm:text-[15px]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-semibold text-[#141A2B]">Lunes a jueves:</span>
                    <span className="text-[#141A2B]">09:00–13:00 | 17:00–19:00</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-semibold text-[#141A2B]">Viernes:</span>
                    <span className="text-[#141A2B]">09:00–13:00</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium text-[#69707F]">Sábado y domingo:</span>
                    <span className="text-[#69707F] italic">Cerrado</span>
                  </div>

                </div>
              </div>

              {/* Dirección */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline">
                <span className="w-[110px] text-[#69707F] text-xs font-semibold tracking-wider uppercase mb-1 sm:mb-0 flex-shrink-0">
                  Dirección
                </span>
                <div>
                  <p className="text-[#141A2B] text-sm sm:text-[15px] font-medium">
                    25 de Mayo 726
                  </p>
                  <p className="text-[#69707F] text-[13px] mt-0.5">
                    Puiggari, Entre Ríos, Argentina
                  </p>
                </div>
              </div>
            </div>

            {/* Dos botones en pastilla */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mt-8">
              {/* Botón WhatsApp Primario */}
              <a
                href="https://wa.me/543434469522"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#25A85A] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 text-center"
              >
                Iniciar conversación por WhatsApp
              </a>

              {/* Botón Instagram Secundario */}
              <a
                href="https://www.instagram.com/aracelibalbuenainmobiliaria?igsi=MWFkaTdocGVjM3JiOA=="
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-[#E1E4EA] bg-transparent px-6 py-3 text-sm font-medium text-[#141A2B] transition-colors hover:bg-white text-center"
              >
                Ver Instagram
              </a>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* Columna Derecha: Tarjeta de Ubicación                                 */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-[#EBEEF6] rounded-[18px] p-[26px] pb-0 flex flex-col justify-between overflow-hidden">

            <div>
              {/* Label de sección */}
              <span className="block text-[#D9382B] text-xs font-bold tracking-[0.16em] uppercase mb-2">
                NUESTRA UBICACIÓN
              </span>

              {/* Título & Dirección */}
              <h3 className="font-bold text-[19px] text-[#10265A] leading-tight">
                Puiggari, Entre Ríos
              </h3>
              <p className="text-[#69707F] text-sm mt-0.5">
                25 de Mayo 726
              </p>
            </div>

            {/* Ilustración de mapa simplificada en SVG */}
            <div className="w-full mt-6 h-52 sm:h-56 relative rounded-t-lg overflow-hidden border-t border-[#D7DFEE]">
              <svg
                viewBox="0 0 400 240"
                className="w-full h-full object-cover"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Fondo tierra verde agua claro */}
                <rect width="400" height="240" fill="#DCEAE6" />

                {/* Río / relieve */}
                <path
                  d="M250,-10 C270,50 310,90 350,130 C375,155 390,190 410,210 L410,-10 Z"
                  fill="#94BCB0"
                />
                <path
                  d="M285,-10 C300,45 335,80 370,120 C395,148 405,185 415,220 L415,-10 Z"
                  fill="#78A99B"
                />
                <path
                  d="M190,245 C230,225 280,215 340,220 C370,222 390,230 410,245 Z"
                  fill="#94BCB0"
                />

                {/* Líneas de calles urbanas finas */}
                <g stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.85" strokeLinecap="round">
                  <line x1="30" y1="210" x2="310" y2="40" />
                  <line x1="80" y1="230" x2="350" y2="70" />
                  <line x1="10" y1="120" x2="270" y2="-10" />
                  <line x1="70" y1="40" x2="210" y2="230" />
                  <line x1="140" y1="20" x2="280" y2="210" />
                  <line x1="210" y1="10" x2="340" y2="180" />
                  <line x1="20" y1="80" x2="130" y2="230" />
                </g>

                <g stroke="#C6DCD5" strokeWidth="1.2" strokeOpacity="0.8">
                  <line x1="50" y1="170" x2="250" y2="50" />
                  <line x1="110" y1="30" x2="230" y2="190" />
                  <line x1="170" y1="30" x2="290" y2="190" />
                  <line x1="100" y1="220" x2="300" y2="100" />
                </g>

                {/* Pin / Punto de ubicación */}
                <g transform="translate(178, 112)">
                  <circle cx="0" cy="0" r="22" fill="#D9382B" fillOpacity="0.15" />
                  <circle cx="0" cy="0" r="12" fill="#D9382B" fillOpacity="0.25" />
                  <circle cx="0" cy="0" r="5.5" fill="#D9382B" stroke="#FFFFFF" strokeWidth="2" />

                  {/* Texto Ubicación en Sans */}
                  <text
                    x="16"
                    y="5"
                    fill="#10265A"
                    fontSize="15"
                    fontWeight="700"
                    letterSpacing="0.01em"
                  >
                    Puiggari
                  </text>
                  <text
                    x="16"
                    y="18"
                    fill="#69707F"
                    fontSize="10"
                    fontWeight="500"
                  >
                    25 de Mayo 726
                  </text>
                </g>
              </svg>
            </div>

            {/* Pie de la tarjeta */}
            <div className="border-t border-[#D7DFEE] py-4 flex items-center justify-between">
              <span className="text-[#69707F] text-sm font-medium">
                Ver en el mapa
              </span>
              <a
                href="https://maps.app.goo.gl/EppvRn4qZTWRLF7j6?g_st=aw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#10265A] text-sm font-semibold hover:text-[#D9382B] transition-colors"
              >
                Abrir en Google Maps →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer minimalista */}
      <footer className="w-full border-t border-[#E1E4EA] bg-[#F7F8FA] py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#69707F]">
          <p>© {new Date().getFullYear()} Negocios Inmobiliarios. Todos los derechos reservados.</p>
          <p>Puiggari, Entre Ríos, Argentina</p>
        </div>
      </footer>
    </div>
  );
}