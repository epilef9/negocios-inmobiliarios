import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Public_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Araceli Balbuena Negocios Inmobiliarios | Villa Libertador San Martín, Entre Ríos",
  description:
    "Casas, departamentos, locales y terrenos en venta y alquiler, y alojamientos por días en Villa Libertador San Martín, Crespo y Diamante. Atención en persona.",
};

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import BienvenidaAdmin from "../components/panel/BienvenidaAdmin";

// Script que se inyecta SINCRÓNICO antes de que React hidrate.
// Elimina la clase "dark" de html si el usuario guardó "light" en localStorage.
// Esto evita el flash de texto blanco sobre fondo claro.
const themeScript = `(function(){
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      document.documentElement.classList.add('motion-ok');
    }
    var t = localStorage.getItem('inmobiliaria_theme');
    var root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme','dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme','light');
    }
  } catch(e){}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${publicSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Script SINCRÓNICO: el navegador lo ejecuta ANTES de pintar cualquier cosa.
          Garantiza que html.dark coincida con lo que el usuario guardó en localStorage.
          Sin esto, Tailwind dark: classes se aplican al fondo claro → texto blanco invisible.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AuthProvider>
          <ThemeProvider>
            {children}
            <BienvenidaAdmin />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
