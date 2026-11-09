'use client';

import { useEffect, useState } from 'react';
import { CONTACTO_PREDETERMINADO, enlacesContacto, getAjustesPublicos, type AjustesPublicos } from '@/services/ajustes';

// Ajustes públicos del sitio. Arranca con los datos de siempre (así el HTML del servidor coincide) y los
// reemplaza por los que cargó el administrador cuando llegan.
export function useAjustes() {
  const [ajustes, setAjustes] = useState<AjustesPublicos>({ contacto: CONTACTO_PREDETERMINADO, costos: null, transferencia: false, lugares: [] });
  useEffect(() => {
    let activo = true;
    getAjustesPublicos()
      .then((a) => activo && setAjustes({ ...a, lugares: a.lugares ?? [], contacto: { ...CONTACTO_PREDETERMINADO, ...a.contacto } }))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);
  return ajustes;
}

// Contacto de la oficina con sus enlaces (WhatsApp, teléfono, mapa)
export function useContacto() {
  const { contacto } = useAjustes();
  return { ...contacto, ...enlacesContacto(contacto) };
}
