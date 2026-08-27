export interface Propiedad {
  // Paso 1 - Datos de la propiedad
  id?: string;
  titulo: string;
  codigoInterno?: string;
  tipoInmueble: string;
  categoriaOperacion: string; // 'venta' | 'alquiler' | 'temporario'
  ciudadZonaBarrio: string;
  provincia: string;
  direccionCompleta: string;
  referenciasUbicacion?: string;
  precioUSD: number | string;
  moneda: string;
  precioARS?: number | string;
  expensas: string;
  montoExpensas?: number | string;
  superficieTotal: number | string;
  cantidadAmbientes: number | string;
  dormitorios: number | string;
  banos: number | string;
  cochera: string; // 'si' | 'no'
  pisoUnidad?: string;
  comodidades: string[];
  otrasComodidades?: string;

  // Paso 2 - Publicación y configuración
  descripcion?: string;
  linkGoogleMaps?: string;
  latitud?: string;
  longitud?: string;
  imagenes?: string[];
  permitirVisita?: boolean;
  permitirWhatsApp?: boolean;
  permitirEmail?: boolean;
  horarioAtencion?: string;
  telefonoWhatsApp?: string;

  // Alquiler temporario
  precioPorNocheUSD?: number | string;
  minimoNoches?: number | string;
  huespedesMaximos?: number | string;
  costoLimpiezaUSD?: number | string;
  checkInDesde?: string;
  checkOutHasta?: string;
  checkInFlexible?: string; // 'si' | 'no'
}
