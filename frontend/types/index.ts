export interface Propiedad {
  id: string;
  titulo: string;
  codigoInterno?: string;
  tipoInmueble: string;
  categoriaOperacion: string;
  ciudadZonaBarrio: string;
  provincia: string;
  direccionCompleta: string;
  referenciasUbicacion?: string;
  precioUSD: number;
  moneda: string;
  precioARS?: number;
  expensas: string;
  montoExpensas?: number;
  superficieTotal: number;
  cantidadAmbientes: number;
  dormitorios: number;
  banos: number;
  cochera: boolean;
  pisoUnidad?: string;
  comodidades: string[];
  otrasComodidades?: string;
  // Campos del Paso 2 (se agregarán cuando se implemente)
  descripcion?: string;
  imagenes?: string[];
  estado?: string;
}
