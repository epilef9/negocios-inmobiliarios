export type EstadoContrato = 'activo' | 'finalizado' | 'cancelado' | 'por_vencer' | 'borrador';

export interface Contrato {
  id: string;
  numeroContrato: string;
  codigoId: string;
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
  };
  propiedad: {
    titulo: string;
    direccion: string;
  };
  fechaInicio: string; // formato DD/MM/YYYY
  fechaFin: string; // formato DD/MM/YYYY
  montoMensual: string; // formato "USD 450" o "ARS 450.000"
  estado: EstadoContrato;
  tipoContrato?: string; // "Alquiler permanente", "Alquiler temporario", "Venta"
  plantilla?: string; // "Contrato de locación estándar"
  duracionMeses?: number;
  depositoGarantia?: string;
  ajuste?: string; // "Semestral", "Anual", etc.
  comision?: string; // "3%", "4%", "5%"
  incluyeGarante?: boolean;
  permitirEdicionManual?: boolean;
  observaciones?: string;
  locadora?: string;
  ultimaActualizacion?: string;
}

const STORAGE_KEY = 'inmobiliaria_contratos_data';

const DEFAULT_CONTRATOS: Contrato[] = [
  {
    id: 'ct-12',
    numeroContrato: 'CT-00012',
    codigoId: '1024',
    cliente: {
      nombre: 'Federico Soria',
      telefono: '+54 9 343 555 5678',
      email: 'fede.soria@hotmail.com',
    },
    propiedad: {
      titulo: 'Dpto. 2 amb. Centro',
      direccion: 'San Martín 1200, Paraná',
    },
    fechaInicio: '01/08/2026',
    fechaFin: '31/07/2028',
    montoMensual: 'USD 450',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 24,
    depositoGarantia: 'USD 450',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    permitirEdicionManual: true,
    observaciones: 'El contrato se redacta según las condiciones acordadas entre las partes.',
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '07/07/2026 16:45 hs',
  },
  {
    id: 'ct-11',
    numeroContrato: 'CT-00011',
    codigoId: '1023',
    cliente: {
      nombre: 'Martina López',
      telefono: '+54 9 343 555 1234',
      email: 'martina.lopez@gmail.com',
    },
    propiedad: {
      titulo: 'Casa 3 dorm. Oro Verde',
      direccion: 'Los Lapachos 850, Oro Verde',
    },
    fechaInicio: '15/06/2026',
    fechaFin: '14/06/2027',
    montoMensual: 'USD 500',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 500',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '14/06/2026 11:20 hs',
  },
  {
    id: 'ct-10',
    numeroContrato: 'CT-00010',
    codigoId: '1022',
    cliente: {
      nombre: 'Joaquín Pérez',
      telefono: '+54 9 343 555 3344',
      email: 'joaquin.perez@live.com',
    },
    propiedad: {
      titulo: 'Local comercial',
      direccion: 'San Martín 980, Paraná',
    },
    fechaInicio: '01/05/2026',
    fechaFin: '30/04/2028',
    montoMensual: 'USD 700',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato comercial estándar',
    duracionMeses: 24,
    depositoGarantia: 'USD 700',
    ajuste: 'Cuatrimestral',
    comision: '4%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '01/05/2026 09:00 hs',
  },
  {
    id: 'ct-9',
    numeroContrato: 'CT-00009',
    codigoId: '1021',
    cliente: {
      nombre: 'Carla Méndez',
      telefono: '+54 9 343 555 9012',
      email: 'carla.mendez@yahoo.com',
    },
    propiedad: {
      titulo: 'Dpto. monoambiente',
      direccion: 'Córdoba 456, Paraná',
    },
    fechaInicio: '10/04/2026',
    fechaFin: '09/04/2027',
    montoMensual: 'USD 320',
    estado: 'por_vencer',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 320',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: false,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '10/04/2026 15:30 hs',
  },
  {
    id: 'ct-8',
    numeroContrato: 'CT-00008',
    codigoId: '1020',
    cliente: {
      nombre: 'Sofía Ramírez',
      telefono: '+54 9 343 555 7766',
      email: 'sofia.ramirez@gmail.com',
    },
    propiedad: {
      titulo: 'Casa 4 dorm. Bajada Grande',
      direccion: 'Bajada Grande 120, Paraná',
    },
    fechaInicio: '05/03/2026',
    fechaFin: '04/03/2027',
    montoMensual: 'USD 600',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 600',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '05/03/2026 12:10 hs',
  },
  {
    id: 'ct-7',
    numeroContrato: 'CT-00007',
    codigoId: '1019',
    cliente: {
      nombre: 'Lucas Benítez',
      telefono: '+54 9 343 555 8899',
      email: 'lucas.benitez@gmail.com',
    },
    propiedad: {
      titulo: 'Dpto. 1 dorm. Parque Urquiza',
      direccion: 'Mitre 250, Paraná',
    },
    fechaInicio: '01/02/2026',
    fechaFin: '31/01/2027',
    montoMensual: 'USD 380',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 380',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '01/02/2026 10:00 hs',
  },
  {
    id: 'ct-6',
    numeroContrato: 'CT-00006',
    codigoId: '1018',
    cliente: {
      nombre: 'Mariana Gómez',
      telefono: '+54 9 343 555 9911',
      email: 'mariana.gomez@gmail.com',
    },
    propiedad: {
      titulo: 'Casa quinta Las Colinas',
      direccion: 'Ruta 11 Km 15, Oro Verde',
    },
    fechaInicio: '10/01/2026',
    fechaFin: '09/01/2028',
    montoMensual: 'USD 550',
    estado: 'cancelado',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 24,
    depositoGarantia: 'USD 550',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '15/02/2026 17:00 hs',
  },
  {
    id: 'ct-5',
    numeroContrato: 'CT-00005',
    codigoId: '1017',
    cliente: {
      nombre: 'Gonzalo Fernández',
      telefono: '+54 9 343 555 2233',
      email: 'gonzalo.f@gmail.com',
    },
    propiedad: {
      titulo: 'Dpto. 3 amb. Costanera',
      direccion: 'Güemes 120, Paraná',
    },
    fechaInicio: '01/12/2025',
    fechaFin: '30/11/2026',
    montoMensual: 'USD 520',
    estado: 'por_vencer',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 520',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '01/12/2025 11:00 hs',
  },
  {
    id: 'ct-4',
    numeroContrato: 'CT-00004',
    codigoId: '1016',
    cliente: {
      nombre: 'Valentina Rossi',
      telefono: '+54 9 343 555 4455',
      email: 'valen.rossi@gmail.com',
    },
    propiedad: {
      titulo: 'Local céntrico Peatonal',
      direccion: 'Peatonal San Martín 680, Paraná',
    },
    fechaInicio: '15/10/2025',
    fechaFin: '14/10/2027',
    montoMensual: 'ARS 600.000',
    estado: 'activo',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato comercial estándar',
    duracionMeses: 24,
    depositoGarantia: 'ARS 600.000',
    ajuste: 'Cuatrimestral',
    comision: '4%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '15/10/2025 14:00 hs',
  },
  {
    id: 'ct-3',
    numeroContrato: 'CT-00003',
    codigoId: '1015',
    cliente: {
      nombre: 'Mateo Álvarez',
      telefono: '+54 9 343 555 6677',
      email: 'mateo.alvarez@gmail.com',
    },
    propiedad: {
      titulo: 'Casa 2 dorm. San Agustín',
      direccion: 'Galán 1420, Paraná',
    },
    fechaInicio: '01/08/2025',
    fechaFin: '31/07/2026',
    montoMensual: 'USD 400',
    estado: 'finalizado',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 400',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: false,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '31/07/2026 18:00 hs',
  },
  {
    id: 'ct-2',
    numeroContrato: 'CT-00002',
    codigoId: '1014',
    cliente: {
      nombre: 'Camila Torres',
      telefono: '+54 9 343 555 1122',
      email: 'cami.torres@gmail.com',
    },
    propiedad: {
      titulo: 'Dpto. 2 amb. Balcón al Río',
      direccion: 'Laurencena 410, Paraná',
    },
    fechaInicio: '01/06/2025',
    fechaFin: '31/05/2026',
    montoMensual: 'USD 450',
    estado: 'finalizado',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato de locación estándar',
    duracionMeses: 12,
    depositoGarantia: 'USD 450',
    ajuste: 'Semestral',
    comision: '3%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '31/05/2026 17:00 hs',
  },
  {
    id: 'ct-1',
    numeroContrato: 'CT-00001',
    codigoId: '1013',
    cliente: {
      nombre: 'Diego Navarro',
      telefono: '+54 9 343 555 3322',
      email: 'diego.navarro@gmail.com',
    },
    propiedad: {
      titulo: 'Oficina céntrica equipada',
      direccion: '25 de Mayo 180, Paraná',
    },
    fechaInicio: '01/01/2025',
    fechaFin: '31/12/2025',
    montoMensual: 'ARS 350.000',
    estado: 'finalizado',
    tipoContrato: 'Alquiler permanente',
    plantilla: 'Contrato comercial estándar',
    duracionMeses: 12,
    depositoGarantia: 'ARS 350.000',
    ajuste: 'Semestral',
    comision: '4%',
    incluyeGarante: true,
    locadora: 'Araceli Balbuena',
    ultimaActualizacion: '31/12/2025 12:00 hs',
  },
];

export function getStoredContratos(): Contrato[] {
  if (typeof window === 'undefined') return DEFAULT_CONTRATOS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTRATOS));
      return DEFAULT_CONTRATOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTRATOS));
    return DEFAULT_CONTRATOS;
  } catch (error) {
    console.error('Error al leer contratos de localStorage:', error);
    return DEFAULT_CONTRATOS;
  }
}

export function saveStoredContratos(contratos: Contrato[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contratos));
  } catch (error) {
    console.error('Error al guardar contratos en localStorage:', error);
  }
}

export function saveOrUpdateContrato(contrato: Contrato): Contrato[] {
  const current = getStoredContratos();
  const exists = current.some((c) => c.id === contrato.id || c.numeroContrato === contrato.numeroContrato);
  let updated: Contrato[];
  if (exists) {
    updated = current.map((c) =>
      c.id === contrato.id || c.numeroContrato === contrato.numeroContrato ? { ...c, ...contrato } : c
    );
  } else {
    updated = [contrato, ...current];
  }
  saveStoredContratos(updated);
  return updated;
}

export function deleteContrato(id: string): Contrato[] {
  const current = getStoredContratos();
  const updated = current.filter((c) => c.id !== id);
  saveStoredContratos(updated);
  return updated;
}
