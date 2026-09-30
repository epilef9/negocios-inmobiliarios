'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from '../../../../components/AdminSidebar';
import {
  Contrato,
  getStoredContratos,
  saveOrUpdateContrato,
} from '../../../../services/contratos';

function GeneracionContratosForm() {
  const searchParams = useSearchParams();
  const contractId = searchParams.get('id');

  // Form State
  const [tipoContrato, setTipoContrato] = useState('Alquiler permanente');
  const [plantilla, setPlantilla] = useState('Contrato de locación estándar');
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState(
    'Dpto. 2 amb. Centro — San Martín 1200'
  );
  const [clienteSeleccionado, setClienteSeleccionado] = useState('Federico Soria');

  const [fechaInicio, setFechaInicio] = useState('01/08/2026');
  const [duracionMeses, setDuracionMeses] = useState('24');
  const [montoMensual, setMontoMensual] = useState('USD 450');
  const [depositoGarantia, setDepositoGarantia] = useState('USD 450');
  const [ajuste, setAjuste] = useState('Semestral');
  const [comision, setComision] = useState('3%');

  const [incluyeGarante, setIncluyeGarante] = useState(true);
  const [permitirEdicionManual, setPermitirEdicionManual] = useState(true);
  const [observaciones, setObservaciones] = useState(
    'El contrato se redacta según las condiciones acordadas entre las partes.'
  );

  const [locadora, setLocadora] = useState('Araceli Balbuena');
  const [estado, setEstado] = useState<'Borrador' | 'Listo' | 'Generado'>('Borrador');
  const [ultimaActualizacion, setUltimaActualizacion] = useState('07/07/2026 16:45 hs');

  // Preview & Zoom controls
  const [zoom, setZoom] = useState<number>(100);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);
  const [modalEnviar, setModalEnviar] = useState(false);

  const documentRef = useRef<HTMLDivElement>(null);

  // Pre-cargar si se pasa un ID por query param
  useEffect(() => {
    if (!contractId) return;
    const contratos = getStoredContratos();
    const encontrado = contratos.find((c) => c.id === contractId || c.numeroContrato === contractId);
    if (encontrado) {
      setClienteSeleccionado(encontrado.cliente.nombre);
      setPropiedadSeleccionada(`${encontrado.propiedad.titulo} — ${encontrado.propiedad.direccion}`);
      setFechaInicio(encontrado.fechaInicio);
      setMontoMensual(encontrado.montoMensual);
      if (encontrado.duracionMeses) setDuracionMeses(String(encontrado.duracionMeses));
      if (encontrado.depositoGarantia) setDepositoGarantia(encontrado.depositoGarantia);
      if (encontrado.tipoContrato) setTipoContrato(encontrado.tipoContrato);
      if (encontrado.plantilla) setPlantilla(encontrado.plantilla);
      if (encontrado.ajuste) setAjuste(encontrado.ajuste);
      if (encontrado.comision) setComision(encontrado.comision);
      if (encontrado.locadora) setLocadora(encontrado.locadora);
      if (encontrado.observaciones) setObservaciones(encontrado.observaciones);
      if (encontrado.ultimaActualizacion) setUltimaActualizacion(encontrado.ultimaActualizacion);
    }
  }, [contractId]);

  const mostrarToast = (texto: string) => {
    setMensajeToast(texto);
    setTimeout(() => setMensajeToast(null), 3000);
  };

  const handleGuardarBorrador = () => {
    const ahora = new Date();
    const fechaStr = `${String(ahora.getDate()).padStart(2, '0')}/${String(
      ahora.getMonth() + 1
    ).padStart(2, '0')}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, '0')}:${String(
      ahora.getMinutes()
    ).padStart(2, '0')} hs`;

    setUltimaActualizacion(fechaStr);
    setEstado('Borrador');

    const nuevo: Contrato = {
      id: contractId || `ct-${Date.now()}`,
      numeroContrato: contractId ? `CT-${contractId.replace('ct-', '')}` : `CT-${Math.floor(10000 + Math.random() * 90000)}`,
      codigoId: String(Math.floor(1000 + Math.random() * 9000)),
      cliente: {
        nombre: clienteSeleccionado,
        telefono: '+54 9 343 555 5678',
      },
      propiedad: {
        titulo: propiedadSeleccionada.split('—')[0]?.trim() || propiedadSeleccionada,
        direccion: propiedadSeleccionada.split('—')[1]?.trim() || 'Paraná, Entre Ríos',
      },
      fechaInicio,
      fechaFin: '31/07/2028',
      montoMensual,
      estado: 'activo',
      tipoContrato,
      plantilla,
      duracionMeses: Number(duracionMeses) || 24,
      depositoGarantia,
      ajuste,
      comision,
      incluyeGarante,
      permitirEdicionManual,
      observaciones,
      locadora,
      ultimaActualizacion: fechaStr,
    };

    saveOrUpdateContrato(nuevo);
    mostrarToast('Borrador guardado exitosamente');
  };

  const handleGenerarDocumento = () => {
    const ahora = new Date();
    const fechaStr = `${String(ahora.getDate()).padStart(2, '0')}/${String(
      ahora.getMonth() + 1
    ).padStart(2, '0')}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, '0')}:${String(
      ahora.getMinutes()
    ).padStart(2, '0')} hs`;

    setUltimaActualizacion(fechaStr);
    setEstado('Generado');
    handleGuardarBorrador();
    mostrarToast('Documento generado y listo para descargar');
  };

  const handleDescargarPDF = () => {
    window.print();
  };

  const getPropiedadLimpia = () => {
    if (propiedadSeleccionada.includes('—')) {
      return propiedadSeleccionada.split('—')[1]?.trim() + ', Paraná, Entre Ríos';
    }
    return propiedadSeleccionada + ', Paraná, Entre Ríos';
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* Toast Notification */}
      {mensajeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg bg-[#0A193D] text-white text-sm font-medium animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {mensajeToast}
        </div>
      )}

      {/* Sidebar Admin */}
      <AdminSidebar activeSection="contratos" />

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto px-8 py-7">
        {/* Encabezado con navegación de vuelta */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/contratos"
              className="text-xs font-semibold text-slate-400 hover:text-[#193B7B] transition flex items-center gap-1"
            >
              ← Volver a contratos
            </Link>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0A193D] tracking-tight">
            Generación de contratos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Seleccioná una plantilla, completá los datos y revisá el documento antes de descargarlo
          </p>
        </div>

        {/* 3 Tarjetas de Estado Superior */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
          {/* Card 1: Plantilla seleccionada */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block">Plantilla seleccionada</span>
              <span className="text-sm font-bold text-slate-800">{plantilla}</span>
            </div>
          </div>

          {/* Card 2: Estado */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block">Estado</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                {estado}
              </span>
            </div>
          </div>

          {/* Card 3: Última actualización */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block">Última actualización</span>
              <span className="text-sm font-bold text-slate-800">{ultimaActualizacion}</span>
            </div>
          </div>
        </div>

        {/* Layout Principal: Formulario a la Izquierda (5 cols) | Vista previa a la Derecha (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tarjeta 1: Datos principales */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                1. Datos principales
              </h2>

              <div className="space-y-3.5 text-xs">
                {/* Tipo de contrato */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-slate-700 w-36">Tipo de contrato</label>
                  <select
                    value={tipoContrato}
                    onChange={(e) => setTipoContrato(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Alquiler permanente">Alquiler permanente</option>
                    <option value="Alquiler temporario">Alquiler temporario</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Compraventa">Compraventa</option>
                  </select>
                </div>

                {/* Plantilla */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-slate-700 w-36">Plantilla</label>
                  <select
                    value={plantilla}
                    onChange={(e) => setPlantilla(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Contrato de locación estándar">Contrato de locación estándar</option>
                    <option value="Contrato comercial estándar">Contrato comercial estándar</option>
                    <option value="Boleto de compraventa">Boleto de compraventa</option>
                  </select>
                </div>

                {/* Propiedad */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-slate-700 w-36">Propiedad</label>
                  <select
                    value={propiedadSeleccionada}
                    onChange={(e) => setPropiedadSeleccionada(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Dpto. 2 amb. Centro — San Martín 1200">
                      Dpto. 2 amb. Centro — San Martín 1200
                    </option>
                    <option value="Casa 3 dorm. Oro Verde — Los Lapachos 850">
                      Casa 3 dorm. Oro Verde — Los Lapachos 850
                    </option>
                    <option value="Local comercial — San Martín 980">
                      Local comercial — San Martín 980
                    </option>
                    <option value="Dpto. monoambiente — Córdoba 456">
                      Dpto. monoambiente — Córdoba 456
                    </option>
                    <option value="Casa 4 dorm. Bajada Grande — Bajada Grande 120">
                      Casa 4 dorm. Bajada Grande — Bajada Grande 120
                    </option>
                  </select>
                </div>

                {/* Cliente */}
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-slate-700 w-36">Cliente</label>
                  <select
                    value={clienteSeleccionado}
                    onChange={(e) => setClienteSeleccionado(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Federico Soria">Federico Soria</option>
                    <option value="Martina López">Martina López</option>
                    <option value="Joaquín Pérez">Joaquín Pérez</option>
                    <option value="Carla Méndez">Carla Méndez</option>
                    <option value="Sofía Ramírez">Sofía Ramírez</option>
                    <option value="Lucas Benítez">Lucas Benítez</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Condiciones del contrato */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                2. Condiciones del contrato
              </h2>

              <div className="space-y-3.5 text-xs">
                {/* Fila 1: Fecha inicio + Duración */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Fecha de inicio</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Duración (meses)</label>
                    <input
                      type="number"
                      value={duracionMeses}
                      onChange={(e) => setDuracionMeses(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Fila 2: Monto mensual + Depósito */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Monto mensual</label>
                    <input
                      type="text"
                      value={montoMensual}
                      onChange={(e) => setMontoMensual(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Depósito en garantía</label>
                    <input
                      type="text"
                      value={depositoGarantia}
                      onChange={(e) => setDepositoGarantia(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Fila 3: Ajuste + Comisión */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ajuste</label>
                    <select
                      value={ajuste}
                      onChange={(e) => setAjuste(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Semestral">Semestral</option>
                      <option value="Cuatrimestral">Cuatrimestral</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Comisión inmobiliaria</label>
                    <select
                      value={comision}
                      onChange={(e) => setComision(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="3%">3%</option>
                      <option value="4%">4%</option>
                      <option value="5%">5%</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Información adicional */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                3. Información adicional
              </h2>

              <div className="space-y-4 text-xs">
                {/* Toggles: Incluye garante + Permitir edición manual */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">Incluye garante</span>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setIncluyeGarante(true)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                          incluyeGarante ? 'bg-[#193B7B] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncluyeGarante(false)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                          !incluyeGarante ? 'bg-[#193B7B] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Permitir edición manual</span>
                    <button
                      type="button"
                      onClick={() => setPermitirEdicionManual(!permitirEdicionManual)}
                      className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${
                        permitirEdicionManual ? 'bg-[#193B7B]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                          permitirEdicionManual ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Adjuntar documentación */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Adjuntar documentación</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/40">
                    <svg className="w-5 h-5 text-slate-400 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Arrastrá archivos aquí o hacé clic para seleccionar
                    </span>
                    <span className="text-[11px] text-slate-400">PDF, DOC, JPG (máx. 10 MB)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción del formulario */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGuardarBorrador}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs shadow-sm transition active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar borrador
              </button>

              <button
                type="button"
                onClick={handleGenerarDocumento}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#cc1f26] hover:bg-[#b0171d] text-white font-bold text-xs shadow-sm transition active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generar documento
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA DEL DOCUMENTO */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header de Vista Previa */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Vista previa del documento
              </h2>

              <div className="flex items-center gap-3">
                {/* Selector de Zoom */}
                <select
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={75}>75%</option>
                  <option value={90}>90%</option>
                  <option value={100}>100%</option>
                  <option value={110}>110%</option>
                  <option value={125}>125%</option>
                </select>

                {/* Pantalla completa */}
                <button
                  type="button"
                  onClick={() => setPantallaCompleta(!pantallaCompleta)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Pantalla completa
                </button>
              </div>
            </div>

            {/* Hoja de papel del documento simulado */}
            <div
              ref={documentRef}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className={`bg-white rounded-2xl p-8 lg:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-200/80 transition-all font-serif text-slate-800 leading-relaxed text-sm ${
                pantallaCompleta ? 'fixed inset-4 z-50 overflow-auto bg-white p-12 max-w-4xl mx-auto shadow-2xl' : ''
              }`}
            >
              {pantallaCompleta && (
                <button
                  onClick={() => setPantallaCompleta(false)}
                  className="absolute top-4 right-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-sans"
                >
                  ✕ Cerrar pantalla completa
                </button>
              )}

              {/* Título del documento */}
              <div className="text-center mb-8">
                <h3 className="text-lg lg:text-xl font-bold tracking-wider text-slate-900 uppercase">
                  CONTRATO DE LOCACIÓN
                </h3>
              </div>

              {/* Texto legal con campos destacados reactivos */}
              <div className="space-y-4 text-justify font-sans text-xs lg:text-sm text-slate-800 leading-relaxed">
                <p>
                  Entre{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {locadora}
                  </mark>
                  , en adelante &quot;LA LOCADORA&quot;, y{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {clienteSeleccionado}
                  </mark>
                  , en adelante &quot;EL LOCATARIO&quot;, se acuerda celebrar el presente contrato de locación sobre el inmueble sito en{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {getPropiedadLimpia()}
                  </mark>
                  , sujeto a las siguientes cláusulas:
                </p>

                <p>
                  <strong>PRIMERA:</strong> El plazo de locación se establece en{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {duracionMeses} meses
                  </mark>
                  , contados a partir del{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {fechaInicio}
                  </mark>
                  .
                </p>

                <p>
                  <strong>SEGUNDA:</strong> El precio del alquiler se fija en{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {montoMensual}
                  </mark>{' '}
                  mensuales, pagaderos dentro de los primeros 5 días de cada mes. El ajuste aplicable será de periodicidad{' '}
                  <strong>{ajuste.toLowerCase()}</strong>.
                </p>

                <p>
                  <strong>TERCERA:</strong> Se establece un depósito en garantía equivalente a un mes de alquiler, es decir,{' '}
                  <mark className="bg-amber-100/90 text-slate-900 font-bold px-1 py-0.5 rounded">
                    {depositoGarantia}
                  </mark>
                  , el cual será restituido al locatario al finalizar el contrato, siempre que el inmueble sea devuelto en las mismas condiciones en que fue entregado, conforme lo establecido en la ley vigente.
                </p>

                {incluyeGarante && (
                  <p>
                    <strong>CUARTA:</strong> El locatario presenta garantía debidamente conformada, comprometiéndose el fiador principal pagador a responder solidariamente por todas las obligaciones emanadas del presente contrato.
                  </p>
                )}

                <p className="pt-2">
                  En prueba de conformidad, se firman dos ejemplares de un mismo tenor y a un solo efecto, en el lugar y fecha indicados.
                </p>
              </div>

              {/* Sección de firmas */}
              <div className="grid grid-cols-2 gap-8 pt-16 mt-8 font-sans text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 w-44 mx-auto pt-2 mb-1"></div>
                  <span className="font-bold text-slate-900 block">{locadora}</span>
                  <span className="text-slate-500 text-[11px]">LA LOCADORA</span>
                </div>

                <div>
                  <div className="border-t border-slate-400 w-44 mx-auto pt-2 mb-1"></div>
                  <span className="font-bold text-slate-900 block">{clienteSeleccionado}</span>
                  <span className="text-slate-500 text-[11px]">EL LOCATARIO</span>
                </div>
              </div>
            </div>

            {/* Barra Inferior de Acciones del Documento */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    Listo para descargar
                  </span>
                  <span className="text-[11px] text-slate-400">
                    El documento está listo para ser descargado o enviado.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Editar campos */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.querySelector('input');
                    el?.focus();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar campos
                </button>

                {/* Descargar PDF */}
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  className="px-4 py-2 rounded-xl bg-[#193B7B] hover:bg-[#122756] text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PDF
                </button>

                {/* Enviar al cliente */}
                <button
                  type="button"
                  onClick={() => setModalEnviar(true)}
                  className="px-4 py-2 rounded-xl bg-[#cc1f26] hover:bg-[#b0171d] text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar al cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Enviar al Cliente */}
      {modalEnviar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Enviar contrato al cliente
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Seleccioná el canal para enviar el contrato a <strong>{clienteSeleccionado}</strong>.
            </p>

            <div className="space-y-3 mb-5">
              <a
                href={`https://wa.me/5493435555678?text=${encodeURIComponent(
                  `Hola ${clienteSeleccionado}, te adjuntamos el contrato de locación para la propiedad "${propiedadSeleccionada}". Quedamos a tu disposición para coordinar la firma.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setModalEnviar(false)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    WA
                  </span>
                  <div>
                    <span className="font-bold text-xs block text-slate-900">Enviar por WhatsApp</span>
                    <span className="text-[11px] text-slate-500">+54 9 343 555 5678</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600">Abrir chat →</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setModalEnviar(false);
                  mostrarToast(`Contrato enviado por correo a ${clienteSeleccionado}`);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    @
                  </span>
                  <div className="text-left">
                    <span className="font-bold text-xs block text-slate-900">Enviar por Email</span>
                    <span className="text-[11px] text-slate-500">cliente@email.com</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">Enviar ahora →</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalEnviar(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneracionContratosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">
          Cargando generador de contratos...
        </div>
      }
    >
      <GeneracionContratosForm />
    </Suspense>
  );
}
