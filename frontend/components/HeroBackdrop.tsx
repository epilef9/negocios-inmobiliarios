"use client";

import Image from "next/image";
import { useState } from "react";

export default function HeroBackdrop() {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="hero-cinematic-scene absolute inset-0" style={{ animationPlayState: paused ? "paused" : "running" }}>
          <Image
            src="/images/home-blue-hour.webp"
            alt=""
            fill
            sizes="100vw"
            preload
            className="object-cover object-[58%_center] sm:object-center"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? "Reanudar movimiento del fondo" : "Pausar movimiento del fondo"}
        className="hero-motion-control absolute bottom-6 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-[#050b18]/40 text-white/80 backdrop-blur-md transition-colors hover:bg-[#050b18]/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 sm:right-8"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {paused ? <path d="M8 5v14l11-7z" /> : <path d="M6 5h4v14H6zm8 0h4v14h-4z" />}
        </svg>
      </button>
    </>
  );
}