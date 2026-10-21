import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import SmoothScroll from './SmoothScroll';
import CursorVer from './CursorVer';
import HumoCursor from './HumoCursor';

// Estructura común de las páginas públicas: fondo azul, barra, scroll suave, cursor y pie
export default function SitioBase({ children, pieSimple = false }: { children: React.ReactNode; pieSimple?: boolean }) {
  return (
    <main className="home-calma-raiz isolate min-h-dvh bg-[#071733] font-sans text-[#efe9df] selection:bg-[#d9382b] selection:text-white">
      <SmoothScroll />
      <CursorVer />
      <HumoCursor />
      <SiteHeader />
      {children}
      <SiteFooter simple={pieSimple} />
    </main>
  );
}
