"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapaUbicacionPropiedadProps = {
  latitud: string;
  longitud: string;
};

const createPropertyPinIcon = () => L.divIcon({
  html: `<div style="position:relative;width:36px;height:36px;transform:translate(-50%,-100%)"><svg viewBox="0 0 24 24" width="36" height="36" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#004bb7" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9" r="3.2" fill="#fff"/></svg><div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:10px;height:3px;background:rgba(0,0,0,.3);border-radius:50%;filter:blur(1.5px)"></div></div>`,
  className: "custom-map-pin",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function MapaUbicacionPropiedad({ latitud, longitud }: MapaUbicacionPropiedadProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parsedLatitud = Number(latitud);
    const parsedLongitud = Number(longitud);
    if (!mapContainerRef.current || !Number.isFinite(parsedLatitud) || !Number.isFinite(parsedLongitud)) return;

    const map = L.map(mapContainerRef.current, {
      center: [parsedLatitud, parsedLongitud],
      zoom: 17,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.marker([parsedLatitud, parsedLongitud], {
      icon: createPropertyPinIcon(),
      draggable: false,
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, [latitud, longitud]);

  return <div ref={mapContainerRef} className="h-80 w-full" aria-label="Mapa con la ubicación de la propiedad" />;
}