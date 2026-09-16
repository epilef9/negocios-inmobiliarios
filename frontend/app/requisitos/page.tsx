"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getUserChecklist, saveUserChecklist } from "@/services/auth";

interface RequirementItem {
  id: string;
  text: string;
}

interface RequirementSection {
  title: string;
  icon: "user" | "shield" | "dollar" | "bank" | "doc" | "info" | "handshake";
  items: RequirementItem[];
}

interface RequirementCard {
  id: "alquilar" | "comprar" | "publicar";
  title: string;
  subtitle: string;
  color: "blue" | "emerald" | "purple";
  badgeIcon: "key" | "house" | "camera";
  sections: RequirementSection[];
}

const requirementCards: RequirementCard[] = [
  {
    id: "alquilar",
    title: "Para alquilar",
    subtitle: "Requisitos y condiciones para inquilinos",
    color: "blue",
    badgeIcon: "key",
    sections: [
      {
        title: "Documentación personal",
        icon: "user",
        items: [
          { id: "alq-dni", text: "DNI del titular y co-titular (frente y dorso)" },
          { id: "alq-cuil", text: "Constancia de CUIL/CUIT" },
          { id: "alq-sueldo", text: "Recibo de sueldo de los últimos 3 meses o constancia de ingresos" },
          { id: "alq-domicilio", text: "Comprobante de domicilio actual" },
        ],
      },
      {
        title: "Garantía",
        icon: "shield",
        items: [
          { id: "alq-garantia-prop", text: "Garantía propietaria con escritura en la provincia de Entre Ríos" },
          { id: "alq-recibo-garante", text: "Recibo de sueldo del garante (ingreso mínimo equivalente a 2 alquileres)" },
          { id: "alq-caucion", text: "Alternativa: seguro de caución (sujeto a evaluación)" },
        ],
      },
      {
        title: "Condiciones económicas",
        icon: "dollar",
        items: [
          { id: "alq-deposito", text: "Depósito en garantía equivalente a 1 mes de alquiler" },
          { id: "alq-comision", text: "Comisión inmobiliaria: 3% a cargo del inquilino" },
          { id: "alq-contrato", text: "Contrato con actualización según índice vigente" },
        ],
      },
    ],
  },
  {
    id: "comprar",
    title: "Para comprar",
    subtitle: "Requisitos y condiciones para compradores",
    color: "emerald",
    badgeIcon: "house",
    sections: [
      {
        title: "Documentación personal",
        icon: "user",
        items: [
          { id: "comp-dni", text: "DNI del titular y co-titular (frente y dorso)" },
          { id: "comp-cuil", text: "Constancia de CUIL/CUIT" },
          { id: "comp-ingresos", text: "Comprobante de ingresos o certificado de ingresos" },
          { id: "comp-domicilio", text: "Comprobante de domicilio actual" },
        ],
      },
      {
        title: "Financiación (si aplica)",
        icon: "bank",
        items: [
          { id: "comp-preaprobacion", text: "Pre-aprobación bancaria o capacidad de pago demostrable" },
          { id: "comp-doc-bancaria", text: "Documentación adicional solicitada por la entidad financiera" },
        ],
      },
      {
        title: "Condiciones económicas",
        icon: "dollar",
        items: [
          { id: "comp-sena", text: "Seña: 10% del valor de la propiedad" },
          { id: "comp-comision", text: "Comisión inmobiliaria: 3% a cargo del comprador" },
          { id: "comp-escritura", text: "Gastos de escritura: a cargo del comprador" },
        ],
      },
    ],
  },
  {
    id: "publicar",
    title: "Para publicar tu propiedad",
    subtitle: "Información para propietarios",
    color: "purple",
    badgeIcon: "camera",
    sections: [
      {
        title: "Documentación de la propiedad",
        icon: "doc",
        items: [
          { id: "pub-escritura", text: "Escritura o título de propiedad" },
          { id: "pub-planos", text: "Planos (si los tuviera)" },
          { id: "pub-impuestos", text: "Impuestos y servicios al día" },
          { id: "pub-reglamento", text: "Reglamento de copropiedad (si aplica)" },
        ],
      },
      {
        title: "Información requerida",
        icon: "info",
        items: [
          { id: "pub-datos", text: "Datos completos de la propiedad" },
          { id: "pub-desc", text: "Descripción detallada y características" },
          { id: "pub-fotos", text: "Fotografías de buena calidad" },
          { id: "pub-precio", text: "Precio de venta o alquiler deseado" },
        ],
      },
      {
        title: "Condiciones",
        icon: "handshake",
        items: [
          { id: "pub-condiciones", text: "La propiedad debe estar en condiciones de ser comercializada" },
          { id: "pub-autorizacion", text: "Firmar autorización para publicar" },
          { id: "pub-disponibilidad", text: "Disponibilidad para visitas y/o tasaciones" },
        ],
      },
    ],
  },
];

function RenderIcon({ type }: { type: string }) {
  switch (type) {
    case "key":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    case "house":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "camera":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "user":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "shield":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "dollar":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 12v-2m0 0c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "bank":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      );
    case "doc":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "info":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "handshake":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function RequisitosPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "alquilar" | "comprar" | "publicar">("todos");
  const [avisoPublicar, setAvisoPublicar] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "local" | "idle">("idle");

  // Cargar checklist al iniciar o cambiar de cuenta (desde BD si está logueado o storage aislado)
  useEffect(() => {
    let isMounted = true;
    const userId = user ? (user.id || (user as any)._id || user.email) : null;
    const storageKey = userId ? `checklist_requisitos_${userId}` : "checklist_requisitos_guest";

    async function initializeChecklist() {
      // 1. Cargar caché local inmediato según el usuario actual
      let localMap: Record<string, boolean> = {};
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (stored) {
          localMap = JSON.parse(stored);
        }
      } catch (err) {
        console.error("Error al leer de localStorage:", err);
      }

      if (user) {
        // Inicializar con la caché del usuario para evitar saltos visuales
        if (isMounted) {
          setCheckedItems(localMap);
          setSyncStatus("saving");
        }

        try {
          // 2. Obtener la fuente de verdad de la base de datos para esta cuenta específica
          const remoteList = await getUserChecklist();
          if (isMounted) {
            const remoteMap: Record<string, boolean> = {};
            remoteList.forEach((id) => {
              remoteMap[id] = true;
            });

            setCheckedItems(remoteMap);
            if (typeof window !== "undefined") {
              localStorage.setItem(storageKey, JSON.stringify(remoteMap));
            }
            setSyncStatus("synced");
          }
        } catch (error) {
          if (isMounted) {
            setCheckedItems(localMap);
            setSyncStatus("local");
          }
        }
      } else {
        // Modo invitado (sin sesión): cada invitado tiene su storage aislado
        if (isMounted) {
          setCheckedItems(localMap);
          setSyncStatus("local");
        }
      }
    }

    if (!isAuthLoading) {
      initializeChecklist();
    }

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistir cambios en localStorage aislado y en base de datos si el usuario tiene sesión
  const persistChecklist = (updated: Record<string, boolean>) => {
    const userId = user ? (user.id || (user as any)._id || user.email) : null;
    const storageKey = userId ? `checklist_requisitos_${userId}` : "checklist_requisitos_guest";

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    if (user) {
      setSyncStatus("saving");
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const activeIds = Object.keys(updated).filter((k) => updated[k]);
          await saveUserChecklist(activeIds);
          setSyncStatus("synced");
        } catch (err) {
          setSyncStatus("local");
        }
      }, 250);
    } else {
      setSyncStatus("local");
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const updated = {
        ...prev,
        [id]: !prev[id],
      };
      persistChecklist(updated);
      return updated;
    });
  };

  const deseleccionarTodos = () => {
    const empty: Record<string, boolean> = {};
    setCheckedItems(empty);
    persistChecklist(empty);
  };

  const cardsToDisplay = filtroActivo === "todos"
    ? requirementCards
    : requirementCards.filter((card) => card.id === filtroActivo);

  // Estadísticas individuales por tarjeta
  const getCardStats = (card: RequirementCard) => {
    const allItems = card.sections.flatMap((s) => s.items);
    const total = allItems.length;
    const checked = allItems.filter((i) => checkedItems[i.id]).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, percent };
  };

  // Estadísticas dinámicas de la vista activa (Alquiler, Compra, Publicar o Todos)
  const getActiveViewStats = () => {
    const allVisibleCards = cardsToDisplay;
    const allVisibleItems = allVisibleCards.flatMap((c) => c.sections.flatMap((s) => s.items));
    const total = allVisibleItems.length;
    const checked = allVisibleItems.filter((i) => checkedItems[i.id]).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    let label = "Requisitos completados";
    let colorClass = "from-blue-600 to-indigo-600";
    let badgeClass = "bg-blue-50 border-blue-200 text-blue-700";

    if (filtroActivo === "alquilar") {
      label = "Documentos para alquilar completados";
      colorClass = "from-blue-500 to-blue-600";
      badgeClass = "bg-blue-50 border-blue-200 text-blue-700";
    } else if (filtroActivo === "comprar") {
      label = "Documentos para comprar completados";
      colorClass = "from-emerald-500 to-emerald-600";
      badgeClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
    } else if (filtroActivo === "publicar") {
      label = "Documentos para publicar completados";
      colorClass = "from-purple-500 to-purple-600";
      badgeClass = "bg-purple-50 border-purple-200 text-purple-700";
    }

    return { total, checked, percent, label, colorClass, badgeClass };
  };

  const activeStats = getActiveViewStats();

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#141a2b] font-sans flex flex-col selection:bg-red-600 selection:text-white">
      {/* 1. Header / Navbar */}
      <header className="relative h-20 bg-[#10265A] font-sans selection:bg-red-600 selection:text-white">
              <Navbar />
        
      </header>

      {/* 2. Main content container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Aviso informativo de Publicar Propiedad (Modal / Toast) */}
        {avisoPublicar && (
          <div className="mb-6 rounded-2xl bg-purple-50 border border-purple-200 p-5 shadow-md flex items-start justify-between gap-4 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-purple-900">
                  Módulo de publicación para propietarios en desarrollo
                </h4>
                <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                  Próximamente estará disponible la función para que los propietarios puedan cargar y publicar su inmueble directamente desde la web. Mientras tanto, podés consultar los requisitos detallados abajo o contactar a nuestro equipo por WhatsApp.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAvisoPublicar(false)}
              className="text-purple-500 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-100 transition text-sm font-bold shrink-0"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eaf2fb] via-[#f2f7fc] to-[#e4eef9] p-6 sm:p-8 lg:p-10 mb-8 border border-blue-100/80 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            {/* Left Header info */}
            <div className="max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Guía para visitantes e inquilinos</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092454] tracking-tight leading-tight">
                Requisitos e información
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Conocé toda la documentación y condiciones necesarias para alquilar, comprar o publicar tu propiedad con nosotros.
              </p>

              {/* Action tabs / filters */}
              <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setFiltroActivo("todos")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    filtroActivo === "todos"
                      ? "bg-[#092454] text-white shadow-md shadow-blue-900/10"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Ver todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroActivo("alquilar")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroActivo === "alquilar"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
                  }`}
                >
                  <span>🔑</span> Para alquilar
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroActivo("comprar")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroActivo === "comprar"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  <span>🏠</span> Para comprar
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroActivo("publicar")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroActivo === "publicar"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
                  }`}
                >
                  <span>📷</span> Para publicar
                </button>
              </div>
            </div>

            {/* Right Illustration: Clipboard with checklist, small plant and house */}
            <div className="relative shrink-0 w-44 h-44 sm:w-56 sm:h-52 flex items-center justify-center pointer-events-none select-none">
              <svg viewBox="0 0 240 220" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background soft circle */}
                <circle cx="120" cy="110" r="95" fill="#E1EDFC" opacity="0.6" />
                <circle cx="120" cy="110" r="75" fill="#FFFFFF" opacity="0.8" />

                {/* House silhouette back */}
                <path d="M150 145V95L185 68L220 95V145H150Z" fill="#B9D5F7" opacity="0.7" />
                <rect x="175" y="115" width="20" height="30" rx="3" fill="#8BB8EC" />
                <rect x="160" y="85" width="16" height="16" rx="2" fill="#FFFFFF" opacity="0.9" />

                {/* Main Clipboard */}
                <rect x="45" y="45" width="115" height="150" rx="14" fill="#FFFFFF" stroke="#C3D9F5" strokeWidth="3" />
                
                {/* Clip on top */}
                <rect x="80" y="32" width="45" height="22" rx="6" fill="#A5C8F2" stroke="#7BAAE5" strokeWidth="2" />
                <circle cx="102.5" cy="43" r="4.5" fill="#FFFFFF" />

                {/* Checklist items lines on clipboard */}
                <g stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round">
                  {/* Row 1 */}
                  <path d="M62 76L67 81L78 70" />
                  <line x1="86" y1="76" x2="142" y2="76" stroke="#CADBF3" strokeWidth="3.5" />
                  
                  {/* Row 2 */}
                  <path d="M62 104L67 109L78 98" />
                  <line x1="86" y1="104" x2="135" y2="104" stroke="#CADBF3" strokeWidth="3.5" />

                  {/* Row 3 */}
                  <path d="M62 132L67 137L78 126" />
                  <line x1="86" y1="132" x2="140" y2="132" stroke="#CADBF3" strokeWidth="3.5" />

                  {/* Row 4 */}
                  <path d="M62 160L67 165L78 154" />
                  <line x1="86" y1="160" x2="125" y2="160" stroke="#CADBF3" strokeWidth="3.5" />
                </g>

                {/* Cute green plant in pot */}
                <path d="M125 185H145L142 160H128L125 185Z" fill="#D97706" opacity="0.8" />
                <ellipse cx="135" cy="160" rx="7" ry="2" fill="#B45309" />
                <path d="M135 160C132 145 120 142 118 135C128 135 135 145 135 160Z" fill="#10B981" />
                <path d="M135 155C140 142 152 140 155 132C145 132 138 142 135 155Z" fill="#34D399" />
              </svg>
            </div>
          </div>

          {/* Checklist Dynamic Progress Bar Panel */}
          <div className="mt-8 pt-5 border-t border-blue-200/90 bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-extrabold shadow-sm shrink-0">
                  {activeStats.checked}
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                    {activeStats.label}: <span className="text-[#092454] font-extrabold">{activeStats.checked} de {activeStats.total}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hacé clic en cualquier requisito de las tarjetas para marcar los documentos que ya tenés listos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {activeStats.checked > 0 && (
                  <button
                    type="button"
                    onClick={deseleccionarTodos}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition underline cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full border font-extrabold text-sm sm:text-base ${activeStats.badgeClass}`}>
                  {activeStats.percent}%
                </span>
              </div>
            </div>

            {/* Dynamic visual progress bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${activeStats.colorClass}`}
                style={{ width: `${activeStats.percent}%` }}
              />
            </div>

            {/* Sync status indicator */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                {user ? (
                  syncStatus === "saving" ? (
                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Sincronizando con tu cuenta...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Progreso guardado en tu cuenta ({user.nombre || user.email})
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardado en este navegador.{" "}
                    <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold underline">
                      Iniciá sesión
                    </Link>{" "}
                    para sincronizarlo en la nube y acceder desde cualquier dispositivo.
                  </span>
                )}
              </div>

              {activeStats.checked > 0 && (
                <span className="text-slate-400 font-normal">
                  {activeStats.checked} {activeStats.checked === 1 ? "requisito seleccionado" : "requisitos seleccionados"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 3. Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {cardsToDisplay.map((card) => {
            const isBlue = card.color === "blue";
            const isEmerald = card.color === "emerald";
            const isPurple = card.color === "purple";

            const badgeBg = isBlue
              ? "bg-blue-100 text-blue-600"
              : isEmerald
              ? "bg-emerald-100 text-emerald-600"
              : "bg-purple-100 text-purple-600";

            const sectionIconBg = isBlue
              ? "bg-blue-50 text-blue-600 border-blue-100"
              : isEmerald
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-purple-50 text-purple-600 border-purple-100";

            const progressGradient = isBlue
              ? "bg-blue-600"
              : isEmerald
              ? "bg-emerald-600"
              : "bg-purple-600";

            const cardStats = getCardStats(card);

            return (
              <div
                key={card.id}
                id={card.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-slate-100">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${badgeBg}`}>
                      <RenderIcon type={card.badgeIcon} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-[#092454] tracking-tight">
                          {card.title}
                        </h2>
                        <span className={`text-[11px] font-bold ${isBlue ? "text-blue-600" : isEmerald ? "text-emerald-600" : "text-purple-600"}`}>
                          {cardStats.percent}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Card Mini Progress bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>Listos: {cardStats.checked}/{cardStats.total}</span>
                      <span>{cardStats.checked === cardStats.total ? "🎉 Completo" : `${cardStats.total - cardStats.checked} restantes`}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${progressGradient}`}
                        style={{ width: `${cardStats.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Sections */}
                  <div className="space-y-6">
                    {card.sections.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-2.5">
                        {/* Section Header */}
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${sectionIconBg}`}>
                            <RenderIcon type={section.icon} />
                          </div>
                          <h3 className="text-xs font-bold text-[#092454] uppercase tracking-wide">
                            {section.title}
                          </h3>
                        </div>

                        {/* Items list */}
                        <ul className="space-y-2 pl-2">
                          {section.items.map((item) => {
                            const isChecked = checkedItems[item.id] || false;
                            return (
                              <li
                                key={item.id}
                                onClick={() => toggleCheck(item.id)}
                                className={`group p-2 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                                  isChecked
                                    ? "bg-blue-50/70 border-blue-200/90 shadow-2xs"
                                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                                }`}
                              >
                                {/* Custom Checkbox Icon */}
                                <div className="mt-0.5 shrink-0">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                                      isChecked
                                        ? `${isBlue ? "bg-blue-600 border-blue-600" : isEmerald ? "bg-emerald-600 border-emerald-600" : "bg-purple-600 border-purple-600"} text-white shadow-2xs`
                                        : "border-2 border-slate-300 bg-white group-hover:border-slate-400"
                                    }`}
                                  >
                                    {isChecked && (
                                      <svg className="w-3 h-3 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-xs leading-snug transition-all ${
                                    isChecked
                                      ? "text-slate-800 font-semibold"
                                      : "text-slate-600 group-hover:text-slate-900"
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Card Button (Solo en la tarjeta de Publicar, sin redireccionar) */}
                {card.id === "publicar" && (
                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAvisoPublicar(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition duration-150 shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Publicar mi propiedad
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* 4. Bottom Call To Action Box */}
        <section className="mt-8 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-extrabold text-[#092454]">
              ¿Tenés dudas?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nuestro equipo está para ayudarte
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* WhatsApp */}
            <a
              href="https://wa.me/5493434449922?text=Hola%20Negocios%20Inmobiliarios,%20quisiera%20consultar%20sobre%20los%20requisitos%20para%20alquilar"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl border border-emerald-500 bg-white hover:bg-emerald-50/80 text-emerald-700 font-bold text-xs sm:text-sm transition duration-150 shadow-2xs"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contactar por WhatsApp
            </a>

            {/* Email */}
            <Link
              href="/contacto"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl border border-blue-500 bg-white hover:bg-blue-50/80 text-blue-700 font-bold text-xs sm:text-sm transition duration-150 shadow-2xs"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Enviar un email
            </Link>
          </div>
        </section>

        {/* 5. Bottom Info / Notice Banner */}
        <aside className="mt-6 rounded-xl bg-blue-50/80 border border-blue-200/90 p-4 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            i
          </div>
          <p className="leading-relaxed">
            Toda la documentación puede estar sujeta a cambios según la normativa vigente y las políticas internas de la inmobiliaria.
          </p>
        </aside>
      </main>
    </div>
  );
}
