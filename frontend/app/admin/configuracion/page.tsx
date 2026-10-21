'use client';

import { useAuth } from '@/context/AuthContext';
import { useTheme, type PaletteId, type ThemeMode } from '@/context/ThemeContext';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import { Encabezado, Tarjeta } from '@/components/panel/ui';

const MODOS: { id: ThemeMode; titulo: string; texto: string; icono: NombreIcono }[] = [
  { id: 'light', titulo: 'Claro', texto: 'Fondo claro, ideal de día.', icono: 'sol' },
  { id: 'dark', titulo: 'Oscuro', texto: 'Cansa menos la vista de noche.', icono: 'luna' },
];

// Miniatura del panel con el modo y la paleta, para ver el resultado antes de elegir
function Miniatura({ oscuro, marca, acento }: { oscuro: boolean; marca: string; acento: string }) {
  return (
    <span aria-hidden="true" className={`flex h-16 w-full overflow-hidden rounded-md ring-1 ring-inset ${oscuro ? 'bg-[#0b1120] ring-[#222d44]' : 'bg-[#f4f5f7] ring-[#e2e5ea]'}`}>
      <span className="h-full w-1/4" style={{ background: oscuro ? '#080d19' : marca }} />
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className={`h-1.5 w-1/2 rounded ${oscuro ? 'bg-[#e7ebf2]/70' : 'bg-[#121a2b]/70'}`} />
        <span className={`h-5 rounded ${oscuro ? 'bg-[#121a2c]' : 'bg-white'}`} />
        <span className="h-1.5 w-1/4 rounded" style={{ background: acento }} />
      </span>
    </span>
  );
}

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const { theme, setTheme, palette, setPalette, palettes, currentPalette } = useTheme();

  return (
    <>
      <Encabezado
        titulo="Configuración"
        descripcion={`Cómo se ve el panel para ${user?.nombre || 'vos'}. Se guarda en tu cuenta, así que se mantiene en cualquier compu.`}
      />

      <div className="flex max-w-4xl flex-col gap-6">
        <Tarjeta titulo="Apariencia" descripcion="Modo claro u oscuro. También se cambia desde el menú, abajo a la izquierda.">
          <div role="radiogroup" aria-label="Apariencia" className="grid gap-3 sm:grid-cols-2">
            {MODOS.map((modo) => {
              const elegido = theme === modo.id;
              return (
                <button
                  key={modo.id}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => setTheme(modo.id)}
                  className={`flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors ${elegido ? 'border-panel-acento ring-2 ring-panel-acento-suave' : 'border-panel-borde hover:bg-panel-hundido'}`}
                >
                  <Miniatura oscuro={modo.id === 'dark'} marca={currentPalette.primary} acento={currentPalette.accent} />
                  <span className="flex items-center gap-2">
                    <Icono nombre={modo.icono} className="h-[18px] w-[18px] text-panel-suave" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{modo.titulo}</span>
                      <span className="block text-[13px] text-panel-suave">{modo.texto}</span>
                    </span>
                    {elegido && <Icono nombre="check" className="h-[18px] w-[18px] text-panel-acento" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Colores del panel" descripcion="El color del menú y de los acentos. El sitio público mantiene sus colores.">
          <div role="radiogroup" aria-label="Colores del panel" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {palettes.map((p) => {
              const elegida = palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={elegida}
                  onClick={() => setPalette(p.id as PaletteId)}
                  className={`flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors ${elegida ? 'border-panel-acento ring-2 ring-panel-acento-suave' : 'border-panel-borde hover:bg-panel-hundido'}`}
                >
                  <Miniatura oscuro={theme === 'dark'} marca={p.primary} acento={p.accent} />
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-1">
                      <span className="h-4 w-4 rounded-full ring-2 ring-panel-superficie" style={{ background: p.primary }} />
                      <span className="h-4 w-4 rounded-full ring-2 ring-panel-superficie" style={{ background: p.accent }} />
                    </span>
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    {elegida && <Icono nombre="check" className="h-[18px] w-[18px] text-panel-acento" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}
