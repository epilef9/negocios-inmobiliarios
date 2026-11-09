'use client';

import { useEffect, useRef } from 'react';

// Humo que se mueve con el mouse, como si se lo corriera con la mano.
// Es una simulación de fluido chiquita en WebGL: el mouse empuja el aire, el aire arrastra el humo,
// se forman remolinos y todo se desvanece en un par de segundos.
// Va detrás del contenido (el <main> aísla las capas), así que nunca tapa letras.
// Solo con mouse; en celulares, en navegadores sin WebGL2 o con "reducir animaciones" no aparece.

// Ajustes del humo
const RESOLUCION_AIRE = 128; // detalle del movimiento del aire
const RESOLUCION_HUMO = 512; // detalle del humo que se ve
const DISIPACION_HUMO = 0.9; // qué tan rápido se apaga el humo
const RITMO = 0.6; // 1 = tiempo real; menos de 1 = el humo se mueve más lento, como en cámara lenta
const DISIPACION_AIRE = 0.35; // qué tan rápido se calma el aire
const REMOLINOS = 14; // cuánto se enrosca
const ITERACIONES_PRESION = 18;
const RADIO = 0.24; // tamaño de cada bocanada
const FUERZA = 2400; // cuánto empuja el mouse
const COLOR: [number, number, number] = [0.94, 0.91, 0.86]; // crema del sitio
const INTENSIDAD = 0.009; // bien tenue: apenas un velo sobre el fondo

const VERTICE = `#version 300 es
in vec2 aPosicion;
out vec2 vUv, vL, vR, vT, vB;
uniform vec2 texel;
void main() {
  vUv = aPosicion * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0);
  vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y);
  vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPosicion, 0.0, 1.0);
}`;

const encabezado = `#version 300 es
precision highp float;
in vec2 vUv, vL, vR, vT, vB;
out vec4 color;
`;

const FRAGMENTOS = {
  bocanada: `${encabezado}
uniform sampler2D destino;
uniform float aspecto, radio;
uniform vec3 valor;
uniform vec2 punto;
void main() {
  vec2 p = vUv - punto;
  p.x *= aspecto;
  vec3 suma = exp(-dot(p, p) / radio) * valor;
  color = vec4(texture(destino, vUv).xyz + suma, 1.0);
}`,
  arrastre: `${encabezado}
uniform sampler2D velocidad, fuente;
uniform vec2 texelAire;
uniform float dt, disipacion;
void main() {
  vec2 desde = vUv - dt * texture(velocidad, vUv).xy * texelAire;
  color = texture(fuente, desde) / (1.0 + disipacion * dt);
}`,
  divergencia: `${encabezado}
uniform sampler2D velocidad;
void main() {
  float L = texture(velocidad, vL).x, R = texture(velocidad, vR).x;
  float T = texture(velocidad, vT).y, B = texture(velocidad, vB).y;
  vec2 C = texture(velocidad, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  color = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  giro: `${encabezado}
uniform sampler2D velocidad;
void main() {
  float L = texture(velocidad, vL).y, R = texture(velocidad, vR).y;
  float T = texture(velocidad, vT).x, B = texture(velocidad, vB).x;
  color = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  remolino: `${encabezado}
uniform sampler2D velocidad, giro;
uniform float fuerza, dt;
void main() {
  float L = texture(giro, vL).x, R = texture(giro, vR).x;
  float T = texture(giro, vT).x, B = texture(giro, vB).x;
  float C = texture(giro, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f = f / (length(f) + 0.0001) * fuerza * C;
  f.y *= -1.0;
  vec2 v = texture(velocidad, vUv).xy + f * dt;
  color = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  presion: `${encabezado}
uniform sampler2D presion, divergencia;
void main() {
  float L = texture(presion, vL).x, R = texture(presion, vR).x;
  float T = texture(presion, vT).x, B = texture(presion, vB).x;
  color = vec4((L + R + B + T - texture(divergencia, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  restarGradiente: `${encabezado}
uniform sampler2D presion, velocidad;
void main() {
  float L = texture(presion, vL).x, R = texture(presion, vR).x;
  float T = texture(presion, vT).x, B = texture(presion, vB).x;
  color = vec4(texture(velocidad, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
  atenuar: `${encabezado}
uniform sampler2D textura;
uniform float valor;
void main() { color = valor * texture(textura, vUv); }`,
  mostrar: `${encabezado}
uniform sampler2D textura;
void main() {
  vec3 c = texture(textura, vUv).rgb;
  // Tope de opacidad: aunque se junte mucho humo en un lugar, nunca pasa de un velo transparente
  float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 0.09);
  color = vec4(min(c, vec3(a)), a);
}`,
};

type Programa = { programa: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type Buffer = { textura: WebGLTexture; fbo: WebGLFramebuffer; ancho: number; alto: number };
type Doble = { leer: Buffer; escribir: Buffer; cambiar: () => void };

export default function HumoCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    const apto = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!apto.matches) return;
    const gl = lienzo.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl || gl.isContextLost() || !gl.getExtension('EXT_color_buffer_float')) return;

    const compilar = (tipo: number, fuente: string) => {
      const s = gl.createShader(tipo)!;
      gl.shaderSource(s, fuente);
      gl.compileShader(s);
      return s;
    };
    const vertice = compilar(gl.VERTEX_SHADER, VERTICE);
    const crearPrograma = (fuente: string): Programa => {
      const programa = gl.createProgram()!;
      gl.attachShader(programa, vertice);
      gl.attachShader(programa, compilar(gl.FRAGMENT_SHADER, fuente));
      gl.bindAttribLocation(programa, 0, 'aPosicion');
      gl.linkProgram(programa);
      const u: Programa['u'] = {};
      const total = gl.getProgramParameter(programa, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < total; i += 1) {
        const nombre = gl.getActiveUniform(programa, i)!.name;
        u[nombre] = gl.getUniformLocation(programa, nombre);
      }
      return { programa, u };
    };
    const programas = Object.fromEntries(Object.entries(FRAGMENTOS).map(([nombre, fuente]) => [nombre, crearPrograma(fuente)])) as Record<keyof typeof FRAGMENTOS, Programa>;
    if (!gl.getProgramParameter(programas.mostrar.programa, gl.LINK_STATUS)) return;

    // Un rectángulo que cubre todo: cada paso de la simulación se dibuja sobre él
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const dibujarEn = (destino: Buffer | null) => {
      if (destino) {
        gl.viewport(0, 0, destino.ancho, destino.alto);
        gl.bindFramebuffer(gl.FRAMEBUFFER, destino.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    const crearBuffer = (ancho: number, alto: number): Buffer => {
      const textura = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, ancho, alto, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textura, 0);
      gl.viewport(0, 0, ancho, alto);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { textura, fbo, ancho, alto };
    };
    const crearDoble = (ancho: number, alto: number): Doble => {
      const doble = {
        leer: crearBuffer(ancho, alto),
        escribir: crearBuffer(ancho, alto),
        cambiar() {
          [doble.leer, doble.escribir] = [doble.escribir, doble.leer];
        },
      };
      return doble;
    };
    const medidas = (base: number) => {
      const aspecto = gl.drawingBufferWidth / gl.drawingBufferHeight;
      const largo = Math.round(base * (aspecto < 1 ? 1 / aspecto : aspecto));
      return aspecto > 1 ? [largo, base] : [base, largo];
    };

    let humo: Doble;
    let aire: Doble;
    let presion: Doble;
    let divergencia: Buffer;
    let giro: Buffer;
    const preparar = () => {
      const densidad = Math.min(window.devicePixelRatio || 1, 1.5);
      lienzo.width = Math.round(window.innerWidth * densidad);
      lienzo.height = Math.round(window.innerHeight * densidad);
      const [ah, hh] = medidas(RESOLUCION_HUMO);
      const [aa, ha] = medidas(RESOLUCION_AIRE);
      humo = crearDoble(ah, hh);
      aire = crearDoble(aa, ha);
      presion = crearDoble(aa, ha);
      divergencia = crearBuffer(aa, ha);
      giro = crearBuffer(aa, ha);
    };
    preparar();

    const usar = (p: Programa) => {
      gl.useProgram(p.programa);
      return p.u;
    };
    const textura = (unidad: number, buffer: Buffer) => {
      gl.activeTexture(gl.TEXTURE0 + unidad);
      gl.bindTexture(gl.TEXTURE_2D, buffer.textura);
      return unidad;
    };

    const bocanada = (x: number, y: number, dx: number, dy: number) => {
      const aspecto = lienzo.width / lienzo.height;
      let u = usar(programas.bocanada);
      gl.uniform2f(u.texel, 1 / aire.leer.ancho, 1 / aire.leer.alto);
      gl.uniform1i(u.destino, textura(0, aire.leer));
      gl.uniform1f(u.aspecto, aspecto);
      gl.uniform2f(u.punto, x, y);
      gl.uniform3f(u.valor, dx, dy, 0);
      gl.uniform1f(u.radio, (RADIO / 100) * (aspecto > 1 ? aspecto : 1));
      dibujarEn(aire.escribir);
      aire.cambiar();

      u = usar(programas.bocanada);
      gl.uniform1i(u.destino, textura(0, humo.leer));
      gl.uniform3f(u.valor, COLOR[0] * INTENSIDAD, COLOR[1] * INTENSIDAD, COLOR[2] * INTENSIDAD);
      dibujarEn(humo.escribir);
      humo.cambiar();
    };

    const paso = (dt: number) => {
      gl.disable(gl.BLEND);
      const texelAire = [1 / aire.leer.ancho, 1 / aire.leer.alto] as const;

      let u = usar(programas.giro);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform1i(u.velocidad, textura(0, aire.leer));
      dibujarEn(giro);

      u = usar(programas.remolino);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform1i(u.velocidad, textura(0, aire.leer));
      gl.uniform1i(u.giro, textura(1, giro));
      gl.uniform1f(u.fuerza, REMOLINOS);
      gl.uniform1f(u.dt, dt);
      dibujarEn(aire.escribir);
      aire.cambiar();

      u = usar(programas.divergencia);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform1i(u.velocidad, textura(0, aire.leer));
      dibujarEn(divergencia);

      u = usar(programas.atenuar);
      gl.uniform1i(u.textura, textura(0, presion.leer));
      gl.uniform1f(u.valor, 0.8);
      dibujarEn(presion.escribir);
      presion.cambiar();

      u = usar(programas.presion);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform1i(u.divergencia, textura(0, divergencia));
      for (let i = 0; i < ITERACIONES_PRESION; i += 1) {
        gl.uniform1i(u.presion, textura(1, presion.leer));
        dibujarEn(presion.escribir);
        presion.cambiar();
      }

      u = usar(programas.restarGradiente);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform1i(u.presion, textura(0, presion.leer));
      gl.uniform1i(u.velocidad, textura(1, aire.leer));
      dibujarEn(aire.escribir);
      aire.cambiar();

      u = usar(programas.arrastre);
      gl.uniform2f(u.texel, ...texelAire);
      gl.uniform2f(u.texelAire, ...texelAire);
      gl.uniform1i(u.velocidad, textura(0, aire.leer));
      gl.uniform1i(u.fuente, textura(0, aire.leer));
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.disipacion, DISIPACION_AIRE);
      dibujarEn(aire.escribir);
      aire.cambiar();

      gl.uniform1i(u.velocidad, textura(0, aire.leer));
      gl.uniform1i(u.fuente, textura(1, humo.leer));
      gl.uniform1f(u.disipacion, DISIPACION_HUMO);
      dibujarEn(humo.escribir);
      humo.cambiar();
    };

    const mostrar = () => {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const u = usar(programas.mostrar);
      gl.uniform2f(u.texel, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      gl.uniform1i(u.textura, textura(0, humo.leer));
      dibujarEn(null);
    };

    // El bucle corre solo mientras hay humo: unos segundos después del último movimiento se detiene
    let cuadro = 0;
    let ultimo = performance.now();
    let ultimoMovimiento = 0;
    const bucle = (ahora: number) => {
      const dt = Math.min((ahora - ultimo) / 1000, 0.016666) * RITMO;
      ultimo = ahora;
      paso(dt);
      mostrar();
      cuadro = ahora - ultimoMovimiento < 5000 ? requestAnimationFrame(bucle) : 0;
    };

    let previo: { x: number; y: number } | null = null;
    const mover = (evento: PointerEvent) => {
      if (evento.pointerType !== 'mouse') return;
      const x = evento.clientX / window.innerWidth;
      const y = 1 - evento.clientY / window.innerHeight;
      if (previo) {
        const dx = (x - previo.x) * (window.innerWidth / window.innerHeight);
        const dy = y - previo.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.0005) bocanada(x, y, dx * FUERZA, dy * FUERZA);
      }
      previo = { x, y };
      ultimoMovimiento = performance.now();
      if (!cuadro) {
        ultimo = performance.now();
        cuadro = requestAnimationFrame(bucle);
      }
    };
    const salir = () => {
      previo = null;
    };
    let esperaMedida: ReturnType<typeof setTimeout> | undefined;
    const alCambiarTamano = () => {
      clearTimeout(esperaMedida);
      esperaMedida = setTimeout(preparar, 200);
    };

    window.addEventListener('pointermove', mover, { passive: true });
    document.documentElement.addEventListener('pointerleave', salir);
    window.addEventListener('resize', alCambiarTamano);
    return () => {
      window.removeEventListener('pointermove', mover);
      document.documentElement.removeEventListener('pointerleave', salir);
      window.removeEventListener('resize', alCambiarTamano);
      clearTimeout(esperaMedida);
      if (cuadro) cancelAnimationFrame(cuadro);
      // No se libera el contexto a mano: en desarrollo React monta dos veces y el lienzo quedaría inservible
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
