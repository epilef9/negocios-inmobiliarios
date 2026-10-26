'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mapa satelital fijo (no se arrastra ni se hace zoom a mano): solo se mueve cuando se elige otra
// localidad, "volando" hasta su encuadre. Cada propiedad es un "+" que avisa al pasar el mouse o tocarlo.

export type PuntoMapa = { id: string; lat: number; lng: number; titulo: string };
export type Encuadre = [[number, number], [number, number]];
export type Posicion = { x: number; y: number };

type Props = {
  encuadre: Encuadre;
  puntos: PuntoMapa[];
  activo: string | null;
  onElegir: (id: string, posicion: Posicion, via: 'hover' | 'click') => void;
  onSalir: (id: string) => void;
  onFondo: () => void;
  onMoviendo: (moviendo: boolean) => void;
  onPosicion: (posicion: Posicion | null) => void;
};

// Imágenes satelitales de Esri (World Imagery): se pueden usar en la web mostrando la atribución
const TESELAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATRIBUCION = 'Imágenes © Esri, Maxar, Earthstar Geographics';

// El nombre de la propiedad va en la opción `title` del marcador (texto plano), nunca dentro de este HTML
const iconoPin = () =>
  L.divIcon({
    className: 'mapa-pin',
    html: '<span class="mapa-pin-anillo" aria-hidden="true"></span><span class="mapa-pin-boton" aria-hidden="true">+</span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

const sinMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MapaSatelital({ encuadre, puntos, activo, onElegir, onSalir, onFondo, onMoviendo, onPosicion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcadores = useRef(new Map<string, L.Marker>());
  const encuadreActual = useRef(encuadre);
  const activoRef = useRef(activo);

  // Las funciones del padre cambian en cada render: se guardan en refs para no rearmar el mapa
  const avisos = useRef({ onElegir, onSalir, onFondo, onMoviendo, onPosicion });
  useEffect(() => {
    avisos.current = { onElegir, onSalir, onFondo, onMoviendo, onPosicion };
  });

  const posicionDe = (id: string | null): Posicion | null => {
    const m = id ? marcadores.current.get(id) : undefined;
    if (!m || !mapa.current) return null;
    const p = mapa.current.latLngToContainerPoint(m.getLatLng());
    return { x: p.x, y: p.y };
  };

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!contenedor.current) return;
    const m = L.map(contenedor.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.25,
      attributionControl: true,
    });
    m.attributionControl.setPrefix(false);
    L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 18, maxNativeZoom: 18 }).addTo(m);
    m.fitBounds(encuadreActual.current, { animate: false });

    m.on('movestart', () => avisos.current.onMoviendo(true));
    m.on('moveend', () => {
      avisos.current.onMoviendo(false);
      avisos.current.onPosicion(posicionDe(activoRef.current));
    });
    m.on('click', () => avisos.current.onFondo());

    // Si cambia el tamaño (rotar el celular, achicar la ventana) se vuelve a encuadrar la zona
    const observador = new ResizeObserver(() => {
      m.invalidateSize({ animate: false });
      m.fitBounds(encuadreActual.current, { animate: false });
    });
    observador.observe(contenedor.current);

    mapa.current = m;
    const lista = marcadores.current;
    return () => {
      observador.disconnect();
      lista.clear();
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Marcadores de las propiedades
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const capa = L.layerGroup().addTo(m);
    const lista = marcadores.current;
    lista.clear();
    for (const punto of puntos) {
      const marcador = L.marker([punto.lat, punto.lng], {
        icon: iconoPin(),
        title: punto.titulo,
        alt: punto.titulo,
        keyboard: true,
        riseOnHover: true,
      });
      marcador.on('mouseover', () => avisos.current.onElegir(punto.id, posicionDe(punto.id) ?? { x: 0, y: 0 }, 'hover'));
      marcador.on('mouseout', () => avisos.current.onSalir(punto.id));
      marcador.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        avisos.current.onElegir(punto.id, posicionDe(punto.id) ?? { x: 0, y: 0 }, 'click');
      });
      marcador.on('keypress', (e) => {
        const tecla = (e as L.LeafletKeyboardEvent).originalEvent.key;
        if (tecla === 'Enter' || tecla === ' ') avisos.current.onElegir(punto.id, posicionDe(punto.id) ?? { x: 0, y: 0 }, 'click');
      });
      marcador.addTo(capa);
      lista.set(punto.id, marcador);
    }
    return () => {
      capa.remove();
    };
  }, [puntos]);

  // Volar a la zona elegida
  useEffect(() => {
    const m = mapa.current;
    encuadreActual.current = encuadre;
    if (!m) return;
    if (sinMovimiento()) m.fitBounds(encuadre, { animate: false });
    else m.flyToBounds(encuadre, { duration: 2.4, easeLinearity: 0.2 });
  }, [encuadre]);

  // Marcar el "+" activo y avisar dónde está para ubicar la tarjeta
  useEffect(() => {
    activoRef.current = activo;
    for (const [id, marcador] of marcadores.current) {
      marcador.getElement()?.classList.toggle('es-activo', id === activo);
    }
    avisos.current.onPosicion(posicionDe(activo));
  }, [activo, puntos]);

  return <div ref={contenedor} className="mapa-satelital absolute inset-0" />;
}
