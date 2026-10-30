// Monto en letras para recibos: 350000.5 → «trescientos cincuenta mil con 50/100»

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

// 0 a 999
const centenas = (n: number): string => {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = resto < 30 ? UNIDADES[resto] : `${DECENAS[Math.floor(resto / 10)]}${resto % 10 ? ` y ${UNIDADES[resto % 10]}` : ''}`;
  return [CENTENAS[c], d].filter(Boolean).join(' ');
};

// «uno» se apocopa delante de «mil» y «millones»: veintiún mil, un millón
const apocopar = (texto: string) => texto.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

const entero = (n: number): string => {
  if (n === 0) return 'cero';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? 'un millón' : `${apocopar(entero(millones))} millones`);
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocopar(centenas(miles))} mil`);
  if (resto) partes.push(centenas(resto));
  return partes.join(' ');
};

export function enLetras(monto: number) {
  const pesos = Math.floor(monto);
  const centavos = Math.round((monto - pesos) * 100);
  return `${entero(pesos)}${centavos ? ` con ${String(centavos).padStart(2, '0')}/100` : ''}`;
}
