// Fotos de propiedades al tamaño en que se ven: Cloudinary y Unsplash achican la imagen de su lado
// (formato y calidad automáticos), así el celular no baja una foto de 1800 px para una tarjeta de 390.
// Las demás direcciones se usan tal cual.

const ANCHOS = [400, 640, 960, 1280, 1800];

export function fotoDeAncho(url: string, ancho: number): string {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${ancho}/`);
  }
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(ancho));
      u.searchParams.set('auto', 'format');
      u.searchParams.delete('fm');
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

// Atributos para un <img>: src de respaldo y srcSet para que el navegador elija según `sizes`
export function propsFoto(url: string, sizes: string, anchoRespaldo = 960) {
  if (!url || fotoDeAncho(url, 1) === url) return { src: url };
  return {
    src: fotoDeAncho(url, anchoRespaldo),
    srcSet: ANCHOS.map((w) => `${fotoDeAncho(url, w)} ${w}w`).join(', '),
    sizes,
  };
}
