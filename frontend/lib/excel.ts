// Exportar a Excel desde el panel: arma un .xlsx en el navegador con lo que se ve en pantalla y lo descarga.
// Sin librerías: un .xlsx es un .zip con unos XML adentro. Los archivos van sin comprimir (alcanza para unas
// miles de filas) y el texto va dentro de cada celda (inlineStr), así no hace falta una tabla de textos aparte.

export type Celda = string | number | null | undefined;
export type Hoja = { nombre: string; columnas: string[]; filas: Celda[][] };

// ---------- ZIP sin compresión ----------
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(archivos: { nombre: string; datos: Uint8Array }[]): Uint8Array {
  const texto = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const { nombre, datos } of archivos) {
    const nombreBytes = texto.encode(nombre);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin compresión
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombreBytes.length, true);
    partes.push(new Uint8Array(local.buffer), nombreBytes, datos);

    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true);
    entrada.setUint16(6, 20, true);
    entrada.setUint16(8, 0x0800, true);
    entrada.setUint16(10, 0, true);
    entrada.setUint32(16, crc, true);
    entrada.setUint32(20, datos.length, true);
    entrada.setUint32(24, datos.length, true);
    entrada.setUint16(28, nombreBytes.length, true);
    entrada.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(entrada.buffer), nombreBytes);

    desplazamiento += 30 + nombreBytes.length + datos.length;
  }
  const tamanoCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);

  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of todo) {
    salida.set(p, i);
    i += p.length;
  }
  return salida;
}

// ---------- Planilla ----------
const escapar = (texto: string) =>
  texto
    // Caracteres de control que Excel no acepta en XML
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Letra de la columna: 0 → A, 25 → Z, 26 → AA
const columna = (n: number): string => (n < 26 ? String.fromCharCode(65 + n) : columna(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26)));

// Un texto que empieza con =, +, - o @ Excel lo puede tomar como fórmula: va con un apóstrofo adelante
const seguro = (texto: string) => (/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto);

const celda = (valor: Celda, ref: string, estilo = 0) => {
  const s = estilo ? ` s="${estilo}"` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  if (valor === null || valor === undefined || valor === '') return '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(seguro(String(valor)))}</t></is></c>`;
};

function xmlHoja({ columnas, filas }: Hoja) {
  // Ancho de cada columna según el texto más largo (con un tope)
  const anchos = columnas.map((titulo, i) => Math.min(60, Math.max(titulo.length, ...filas.map((f) => String(f[i] ?? '').length)) + 2));
  const cols = anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join('');
  const encabezado = `<row r="1">${columnas.map((t, i) => celda(t, `${columna(i)}1`, 1)).join('')}</row>`;
  const cuerpo = filas.map((f, r) => `<row r="${r + 2}">${f.map((v, i) => celda(v, `${columna(i)}${r + 2}`)).join('')}</row>`).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // La primera fila queda fija al bajar
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${encabezado}${cuerpo}</sheetData>` +
    (filas.length ? `<autoFilter ref="A1:${columna(columnas.length - 1)}${filas.length + 1}"/>` : '') +
    '</worksheet>'
  );
}

// Nombre de hoja válido para Excel: sin []:*?/\ y hasta 31 caracteres, sin repetir
const nombresDeHoja = (hojas: Hoja[]) => {
  const usados = new Set<string>();
  return hojas.map((h, i) => {
    let base = h.nombre.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || `Hoja ${i + 1}`;
    while (usados.has(base.toLowerCase())) base = `${base.slice(0, 28)} ${i + 1}`;
    usados.add(base.toLowerCase());
    return base;
  });
};

export function armarExcel(hojas: Hoja[]): Uint8Array {
  const texto = new TextEncoder();
  const nombres = nombresDeHoja(hojas);
  const archivo = (nombre: string, xml: string) => ({ nombre, datos: texto.encode(xml) });
  const cabecera = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    archivo(
      '[Content_Types].xml',
      `${cabecera}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>'
    ),
    archivo(
      '_rels/.rels',
      `${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    ),
    archivo(
      'xl/workbook.xml',
      `${cabecera}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        nombres.map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>'
    ),
    archivo(
      'xl/_rels/workbook.xml.rels',
      `${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    ),
    // Estilos: 0 = normal, 1 = encabezado en negrita con fondo gris
    archivo(
      'xl/styles.xml',
      `${cabecera}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EAEE"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>'
    ),
    ...hojas.map((h, i) => archivo(`xl/worksheets/sheet${i + 1}.xml`, xmlHoja(h))),
  ]);
}

// Nombre del archivo con la fecha de hoy: «clientes-2026-11-09.xlsx»
export const nombreConFecha = (base: string) => `${base}-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })}.xlsx`;

export function descargarExcel(nombreArchivo: string, hojas: Hoja[]) {
  const bytes = armarExcel(hojas);
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
