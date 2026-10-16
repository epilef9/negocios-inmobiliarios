'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../../components/AdminSidebar';
import { useTheme } from '../../../context/ThemeContext';
import { getProperties, reorderProperties, type ApiProperty } from '../../../services/api';

export default function AdminCatalogoPage() {
  const { theme, currentPalette } = useTheme();

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperation, setFilterOperation] = useState('todas');
  const [hasChanges, setHasChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modo interactivo de edición de orden
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Cargar propiedades y aplicar orden guardado si existe
  useEffect(() => {
    getProperties()
      .then((data) => {
        let sorted = [...(data || [])];

        try {
          const cachedOrder = localStorage.getItem('inmobiliaria_custom_catalog_order');
          if (cachedOrder) {
            const orderMap = JSON.parse(cachedOrder) as Record<string, number>;
            sorted.sort((a, b) => {
              const orderA = orderMap[a._id] !== undefined ? orderMap[a._id] : (a.orden ?? 9999);
              const orderB = orderMap[b._id] !== undefined ? orderMap[b._id] : (b.orden ?? 9999);
              return orderA - orderB;
            });
          }
        } catch {
          // ignore
        }

        setProperties(sorted);
        setInitialOrder(sorted.map((p) => p._id));
      })
      .finally(() => setLoading(false));
  }, []);

  // Verificar si hubo cambios respecto al orden inicial
  useEffect(() => {
    if (initialOrder.length === 0 || properties.length === 0) {
      setHasChanges(false);
      return;
    }
    const currentIds = properties.map((p) => p._id);
    const isDifferent = currentIds.some((id, index) => id !== initialOrder[index]);
    setHasChanges(isDifferent);
  }, [properties, initialOrder]);

  // Mover una propiedad hacia arriba
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...properties];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setProperties(updated);
  };

  // Mover una propiedad hacia abajo
  const moveDown = (index: number) => {
    if (index === properties.length - 1) return;
    const updated = [...properties];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setProperties(updated);
  };

  // Mover directamente al primer lugar (#1)
  const moveToTop = (index: number) => {
    if (index === 0) return;
    const updated = [...properties];
    const [selected] = updated.splice(index, 1);
    updated.unshift(selected);
    setProperties(updated);
  };

  // Mover directamente al último lugar
  const moveToBottom = (index: number) => {
    if (index === properties.length - 1) return;
    const updated = [...properties];
    const [selected] = updated.splice(index, 1);
    updated.push(selected);
    setProperties(updated);
  };

  // Asignar posición manual directa (1-indexed)
  const changePosition = (currentIndex: number, targetPosition: number) => {
    const targetIndex = Math.max(0, Math.min(properties.length - 1, targetPosition - 1));
    if (targetIndex === currentIndex) return;

    const updated = [...properties];
    const [selected] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, selected);
    setProperties(updated);
  };

  // Handlers para Drag & Drop nativo
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditingOrder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditingOrder || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!isEditingOrder || draggedIndex === null) return;

    if (draggedIndex !== targetIndex) {
      const updated = [...properties];
      const [item] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, item);
      setProperties(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Guardar nuevo orden en backend y localStorage
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const items = properties.map((p, idx) => ({
        id: p._id,
        orden: idx + 1,
      }));

      // Guardar en backend
      await reorderProperties(items).catch((err) => {
        console.warn('Backend reorder notice:', err);
      });

      // Guardar en cache local para persistencia instantánea
      const orderMap: Record<string, number> = {};
      items.forEach((item) => {
        orderMap[item.id] = item.orden;
      });
      localStorage.setItem('inmobiliaria_custom_catalog_order', JSON.stringify(orderMap));
      localStorage.setItem('inmobiliaria_catalog_updated_at', new Date().toISOString());

      setInitialOrder(properties.map((p) => p._id));
      setHasChanges(false);
      setIsEditingOrder(false);
      setToastMessage('¡Nuevo orden del catálogo guardado y publicado con éxito!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage('Error al guardar el orden. Se guardó localmente.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  // Restablecer al orden original
  const handleResetOrder = () => {
    localStorage.removeItem('inmobiliaria_custom_catalog_order');
    getProperties().then((data) => {
      setProperties(data || []);
      setInitialOrder((data || []).map((p) => p._id));
      setHasChanges(false);
      setToastMessage('Orden restablecido a la secuencia por fecha.');
      setTimeout(() => setToastMessage(null), 3000);
    });
  };

  // Filtrado visual de búsqueda
  const filteredList = properties.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ciudad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigoInterno || '').toLowerCase().includes(searchTerm.toLowerCase());

    const operation = (p.categoria_operacion || p.operation || '').toLowerCase();
    const matchesOp = filterOperation === 'todas' || operation === filterOperation;

    return matchesSearch && matchesOp;
  });

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-[#090e1a] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <AdminSidebar activeSection="catalogo" />

      <main className="flex-1 min-w-0 p-6 sm:p-10 overflow-y-auto">
        {/* Toast Notificación */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-fade-in-up border border-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Encabezado y Acciones Principales */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-300 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-600 dark:text-slate-400">
                  Panel de Administración
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: currentPalette.accent }}
                >
                  Prioridad en Catálogo
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
                Organizador del Catálogo
              </h1>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                Elegí el orden visual exacto en que los clientes ven las propiedades (cuál va 1°, 2°, 3°...).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* BOTÓN PARA ACTIVAR/DESACTIVAR EL MODO DE REORDENAMIENTO */}
              <button
                type="button"
                onClick={() => setIsEditingOrder(!isEditingOrder)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                  isEditingOrder
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{isEditingOrder ? '✓ Finalizar Reordenamiento' : '🔀 Modificar Orden'}</span>
              </button>

              <Link
                href="/propiedades"
                target="_blank"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
              >
                <span>Ver Catálogo en vivo</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>

              {hasChanges && (
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  Descartar
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving || !hasChanges}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: currentPalette.accent }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                <span>Guardar Nuevo Orden</span>
              </button>
            </div>
          </div>

          {/* BANNER INTERACTIVO CUANDO EL MODO EDICIÓN ESTÁ ACTIVO */}
          {isEditingOrder && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md animate-fade-in-up">
              <div className="flex items-center gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <p className="font-extrabold text-sm">Modo de Reordenamiento Activo</p>
                  <p className="text-slate-700 dark:text-amber-200/90 font-medium">
                    Arrastrá las tarjetas con el mouse para cambiar su posición, o utilizá los botones de mover al inicio (⏫) y al final (⏬).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingOrder(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition text-xs"
                >
                  Listo
                </button>
              </div>
            </div>
          )}

          {/* Controles de Búsqueda y Filtros */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, código o ciudad..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Operación:</span>
              <select
                value={filterOperation}
                onChange={(e) => setFilterOperation(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las operaciones</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
                <option value="temporario">Temporario</option>
              </select>
            </div>
          </div>

          {/* Grid de Reordenamiento de Propiedades */}
          {loading ? (
            <div className="p-16 text-center text-sm font-semibold text-slate-600">Cargando catálogo...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No se encontraron propiedades con ese criterio.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredList.map((property) => {
                const globalIndex = properties.findIndex((p) => p._id === property._id);
                const positionNumber = globalIndex + 1;
                const isFirst = globalIndex === 0;
                const isLast = globalIndex === properties.length - 1;
                const isDragging = draggedIndex === globalIndex;
                const isDragOver = dragOverIndex === globalIndex;

                const thumbnail =
                  property.images?.[0] ||
                  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80';

                return (
                  <div
                    key={property._id}
                    draggable={isEditingOrder}
                    onDragStart={(e) => handleDragStart(e, globalIndex)}
                    onDragOver={(e) => handleDragOver(e, globalIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, globalIndex)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                      isEditingOrder
                        ? 'card-floating-edit cursor-grab active:cursor-grabbing border-blue-400 dark:border-blue-500 shadow-md'
                        : isFirst
                        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-500/10 shadow-sm'
                        : theme === 'dark'
                        ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-300 hover:border-slate-400 shadow-xs'
                    } ${isDragging ? 'opacity-40 scale-98 border-dashed' : ''} ${
                      isDragOver ? 'ring-4 ring-blue-500/30 border-blue-500 bg-blue-50/40 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    {/* Parte Izquierda: Drag Handle, Badge de Posición, Foto y Datos */}
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                      {/* Ícono de Arrastre (solo en modo edición) */}
                      {isEditingOrder && (
                        <div
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab p-1 shrink-0"
                          title="Arrastrá para reubicar"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      )}

                      {/* Número de Posición */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 text-center">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shadow-sm ${
                            isFirst
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold'
                          }`}
                        >
                          #{positionNumber}
                        </span>
                        {isFirst && (
                          <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 uppercase mt-0.5">
                            Portada
                          </span>
                        )}
                      </div>

                      {/* Miniatura de la Propiedad */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-slate-700">
                        <img
                          src={thumbnail}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Título, Tipo y Ubicación con alto contraste */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {property.categoria_operacion || property.operation || 'Inmueble'}
                          </span>
                          {property.codigoInterno && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                              {property.codigoInterno}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-1">
                          {property.title}
                        </h3>
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5 font-medium">
                          {property.ciudad ? `${property.ciudad} • ` : ''}
                          <strong className="text-slate-900 dark:text-white font-black">
                            {property.moneda || 'USD'} {Number(property.price).toLocaleString('es-AR')}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* Parte Derecha: Controles de Posicionamiento */}
                    <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      {/* Input directo de número de posición */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 mr-2 font-bold">
                        <span>Pos:</span>
                        <input
                          type="number"
                          min={1}
                          max={properties.length}
                          value={positionNumber}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) changePosition(globalIndex, val);
                          }}
                          className="w-12 px-2 py-1 text-center font-black text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                        />
                      </div>

                      {/* Botón LLEVAR ARRIBA DEL TODO (Top) */}
                      <button
                        type="button"
                        onClick={() => moveToTop(globalIndex)}
                        disabled={isFirst}
                        title="Llevar arriba del todo (Posición #1)"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition text-xs font-bold cursor-pointer"
                      >
                        ⏫ <span className="hidden md:inline text-[11px]">Inicio</span>
                      </button>

                      {/* Botón Subir un lugar */}
                      <button
                        type="button"
                        onClick={() => moveUp(globalIndex)}
                        disabled={isFirst}
                        title="Subir una posición"
                        className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>

                      {/* Botón Bajar un lugar */}
                      <button
                        type="button"
                        onClick={() => moveDown(globalIndex)}
                        disabled={isLast}
                        title="Bajar una posición"
                        className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Botón LLEVAR ABAJO DEL TODO (Bottom) */}
                      <button
                        type="button"
                        onClick={() => moveToBottom(globalIndex)}
                        disabled={isLast}
                        title="Llevar abajo del todo (Última posición)"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition text-xs font-bold cursor-pointer"
                      >
                        ⏬ <span className="hidden md:inline text-[11px]">Final</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
