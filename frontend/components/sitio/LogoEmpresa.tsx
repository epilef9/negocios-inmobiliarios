import Image from 'next/image';

// Logo de Araceli Balbuena Negocios Inmobiliarios con el fondo transparente, con los colores originales.
//  - "linea": todo en una sola línea (columna · ARACELI BALBUENA | NEGOCIOS INMOBILIARIOS), largo como el
//    texto que había antes en la barra. Para pantallas anchas.
//  - "apilado": los dos renglones al lado de la columna. Para celulares y lugares angostos (menú del panel).
// El logo original completo está en images/logo-empresa.png.
const VERSIONES = {
  linea: { src: '/images/logo-empresa-linea.png', width: 1958, height: 200 },
  apilado: { src: '/images/logo-empresa-horizontal.png', width: 1263, height: 300 },
};

export default function LogoEmpresa({
  version = 'apilado',
  className = 'h-10 w-auto',
  prioridad = false,
}: {
  version?: keyof typeof VERSIONES;
  className?: string;
  prioridad?: boolean;
}) {
  const v = VERSIONES[version];
  return <Image src={v.src} alt="Araceli Balbuena · Negocios Inmobiliarios" width={v.width} height={v.height} priority={prioridad} className={className} />;
}
