import type { Metadata } from 'next';
import PaginaLegal from '@/components/legales/PaginaLegal';
import { PRIVACIDAD } from '@/components/legales/contenido';

export const metadata: Metadata = {
  title: 'Política de privacidad | Araceli Balbuena Negocios Inmobiliarios',
  description: 'Qué datos guardamos, para qué, por cuánto tiempo y cómo pedir que se borren.',
};

export default function PrivacidadPage() {
  return (
    <PaginaLegal
      titulo="Privacidad"
      bajada="Qué datos guardamos, para qué, por cuánto tiempo y cómo pedir que se borren."
      secciones={PRIVACIDAD}
      otra={{ href: '/terminos', texto: 'Leer los Términos' }}
    />
  );
}
