'use client';

import { useEffect, useRef } from 'react';
import { animarRevelados } from './motion';

// Envuelve secciones para que sus elementos con data-reveal se animen al aparecer
export default function Revelar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return animarRevelados(ref.current);
  }, []);

  return <div ref={ref}>{children}</div>;
}
