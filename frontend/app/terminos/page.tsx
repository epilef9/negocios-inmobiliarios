import type { Metadata } from 'next';
import PaginaLegal from '@/components/legales/PaginaLegal';
import { TERMINOS } from '@/components/legales/contenido';

export const metadata: Metadata = {
  title: 'Términos y condiciones | Araceli Balbuena Negocios Inmobiliarios',
  description: 'Las reglas para usar el sitio de Araceli Balbuena Negocios Inmobiliarios.',
};

export default function TerminosPage() {
  return (
    <PaginaLegal
      titulo="Términos"
      bajada="Las reglas para usar el sitio, en lenguaje claro."
      secciones={TERMINOS}
      otra={{ href: '/privacidad', texto: 'Leer la Política de privacidad' }}
    />
  );
}
