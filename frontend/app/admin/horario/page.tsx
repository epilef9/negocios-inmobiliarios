'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Icono from '@/components/panel/Icono';
import { getHorario, separarTurnos, turnosDelDia, guardarHorario, type DiaCerrado, type HorarioVisitas, type Tramo, type VisitaFueraDeHorario } from '@/services/agenda';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, GloboError, Insignia, Interruptor, Pestanas, SelectorFecha, Tarjeta, control, sacudir } from '@/components/panel/ui';
import { fechaCorta, hoyIso, sumarDias } from '@/components/calendario/fechas';

// Horario de visitas (HU-19): en qué días y franjas la oficina recibe visitas, cada cuánto empieza un turno
// y qué días cierra. El calendario de "Agendar una visita" de las fichas toma los turnos de acá.

type Editable = Omit<HorarioVisitas, 'texto'>;

// Se muestra de lunes a domingo; en los datos el 0 es el domingo
const ORDEN = [1, 2, 3, 4, 5, 6, 0];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const DURACIONES = [15, 30, 45, 60];
const TRAMOS_POR_DIA = 4;
const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aHora = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
const ULTIMO_MINUTO = 23 * 60 + 59;

// Regla de las franjas (la misma que valida el servidor): duran un número entero de turnos, así el final
// coincide con el final de un turno y no queda un pedazo sin usar.

// Franja nueva: desde las 9, con tantos turnos completos como entren hasta las 13
const tramoNuevo = (duracion: number): Tramo => ({ desde: '09:00', hasta: aHora(9 * 60 + Math.floor(240 / duracion) * duracion) });

// La franja nueva arranca donde termina la última (unas dos horas de turnos completos), para no pisarla
function franjaSiguiente(tramos: Tramo[], duracion: number): Tramo {
  const ultima = tramos[tramos.length - 1];
  if (!ultima) return tramoNuevo(duracion);
  const inicio = minutosDe(ultima.hasta);
  const turnos = Math.max(1, Math.min(Math.round(120 / duracion), Math.floor((ULTIMO_MINUTO - inicio) / duracion)));
  return { desde: ultima.hasta, hasta: aHora(inicio + turnos * duracion) };
}

// Recorta el final para que la franja termine justo en un turno; null si no entra ninguno
function ajustarFranja(t: Tramo, duracion: number): Tramo | null {
  const turnos = Math.floor((minutosDe(t.hasta) - minutosDe(t.desde)) / duracion);
  return turnos >= 1 ? { desde: t.desde, hasta: aHora(minutosDe(t.desde) + turnos * duracion) } : null;
}

// Qué pasaría con otra duración de turno: cada franja se recorta hasta el último turno completo que entra (o se
// quita si no entra ninguno). Se muestra antes de aplicarlo, porque cambia todos los días a la vez.
function simularDuracion(h: Omit<HorarioVisitas, 'texto'>, duracion: number) {
  const ajustes: { dia: number; antes: Tramo; despues: Tramo | null }[] = [];
  const semana = h.semana.map((d, dia) => ({
    tramos: d.tramos.flatMap((t) => {
      const despues = ajustarFranja(t, duracion);
      if (!despues || despues.hasta !== t.hasta) ajustes.push({ dia, antes: t, despues });
      return despues ? [despues] : [];
    }),
  }));
  const porDia = ORDEN.map((dia) => ({
    dia,
    antes: turnosDelDia(h.semana[dia].tramos, h.duracionMinutos).length,
    despues: turnosDelDia(semana[dia].tramos, duracion).length,
  })).filter((d) => d.antes || d.despues);
  const suma = (clave: 'antes' | 'despues') => porDia.reduce((n, d) => n + d[clave], 0);
  // El mismo recorte en varios días va en un solo renglón: "Lunes, martes y miércoles: 09:00–13:00 → 09:00–12:45"
  const agrupados = new Map<string, { dias: number[]; antes: Tramo; despues: Tramo | null }>();
  [...ajustes]
    .sort((a, b) => ORDEN.indexOf(a.dia) - ORDEN.indexOf(b.dia))
    .forEach((a) => {
      const clave = `${a.antes.desde}${a.antes.hasta}${a.despues?.hasta ?? '-'}`;
      const grupo = agrupados.get(clave);
      if (grupo) grupo.dias.push(a.dia);
      else agrupados.set(clave, { dias: [a.dia], antes: a.antes, despues: a.despues });
    });
  return { duracion, semana, ajustes: [...agrupados.values()], recortadas: ajustes.length, porDia, antes: suma('antes'), despues: suma('despues') };
}

// Por qué una franja no sirve (con las horas que sí sirven), o null si está bien. `campo` es lo que se cambió.
function problemaFranja(t: Tramo, duracion: number, campo: 'desde' | 'hasta'): string | null {
  const a = minutosDe(t.desde);
  const b = minutosDe(t.hasta);
  if (b <= a) return `La franja tiene que terminar después de las ${t.desde}.`;
  if (b - a >= duracion && (b - a) % duracion === 0) return null;
  if (campo === 'hasta') {
    const antes = a + Math.max(1, Math.floor((b - a) / duracion)) * duracion;
    const opciones = [antes, antes + duracion].filter((m) => m <= ULTIMO_MINUTO && m !== b).map(aHora);
    return `Con turnos de ${duracion} min, si empieza a las ${t.desde} tiene que terminar a las ${opciones.join(' o ')}.`;
  }
  const despues = b - Math.max(1, Math.floor((b - a) / duracion)) * duracion;
  const opciones = [despues - duracion, despues].filter((m) => m >= 0 && m !== a).map(aHora);
  return `Con turnos de ${duracion} min, si termina a las ${t.hasta} tiene que empezar a las ${opciones.join(' o ')}.`;
}

// Lo que se escribe en un campo de hora → "HH:MM", o null si no es una hora: "9" → 09:00, "905" → 09:05,
// "9:5" → 09:05, "1730" → 17:30
function leerHora(texto: string) {
  const limpio = texto.trim();
  let h: number;
  let m: number;
  if (limpio.includes(':')) [h, m] = limpio.split(':').map((x) => Number(x || 0));
  else {
    const digitos = limpio.replace(/\D/g, '');
    if (!digitos || digitos.length > 4) return null;
    h = Number(digitos.length <= 2 ? digitos : digitos.slice(0, -2));
    m = digitos.length <= 2 ? 0 : Number(digitos.slice(-2));
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59 || h < 0 || m < 0) return null;
  return aHora(h * 60 + m);
}

// Una hora que se escribe a mano (cualquier minuto). Se confirma al salir o con Enter. Se monta con key={valor},
// así se actualiza desde afuera. `alCambiar` aplica la hora y devuelve null, o devuelve por qué no sirve.
// Si no sirve, el campo tiembla, queda en rojo con lo escrito y un globo justo debajo dice qué horas sirven.
// Al escribir de nuevo el globo se va; con Escape, al salir otra vez o a los pocos segundos sin el foco,
// vuelve a la hora anterior.
function CampoHora({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (hora: string) => string | null }) {
  const idGlobo = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(valor);
  const [error, setError] = useState<string | null>(null);

  const volver = () => {
    setTexto(valor);
    setError(null);
  };

  const fallar = (problema: string) => {
    setError(problema);
    sacudir(campo.current);
  };

  const confirmar = (escrito: string) => {
    const hora = leerHora(escrito);
    if (!hora) return fallar('Escribí una hora, por ejemplo 9:05 o 1730.');
    setTexto(hora);
    if (hora === valor) return setError(null);
    const problema = alCambiar(hora);
    if (problema) fallar(problema);
    else setError(null);
  };

  // Error a la vista y el foco en otro lado: a los pocos segundos vuelve a la hora anterior
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => {
      if (document.activeElement === campo.current) return;
      setTexto(valor);
      setError(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [error, valor]);

  return (
    <span className="relative inline-flex">
      <input
        ref={campo}
        type="text"
        inputMode="numeric"
        maxLength={5}
        aria-label={etiqueta}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idGlobo : undefined}
        title="Escribí la hora, por ejemplo 9:05"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setError(null);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => (error ? volver() : confirmar(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar(texto);
          if (e.key === 'Escape') volver();
        }}
        className={`tabular w-[3.75rem] rounded-md px-1.5 py-1 text-center text-[14px] font-medium outline-none transition-colors ${
          error
            ? 'bg-red-50 text-red-700 ring-2 ring-red-500 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-400'
            : 'bg-transparent text-panel-texto hover:bg-panel-superficie focus:bg-panel-superficie focus:ring-2 focus:ring-panel-acento'
        }`}
      />
      {error && (
        <GloboError id={idGlobo} ancla={campo}>
          {error}
        </GloboError>
      )}
    </span>
  );
}

// Eje de horas para toda la semana: de la primera franja a la última, en horas enteras (8 a 20 sin franjas).
// `marcas` es el inicio de cada barra, una por turno posible.
function ejeDe(semana: Editable['semana'], duracion: number) {
  const tramos = semana.flatMap((d) => d.tramos).filter((t) => t.desde < t.hasta);
  let inicio = tramos.length ? Math.floor(Math.min(...tramos.map((t) => minutosDe(t.desde))) / 60) * 60 : 8 * 60;
  let fin = tramos.length ? Math.ceil(Math.max(...tramos.map((t) => minutosDe(t.hasta))) / 60) * 60 : 20 * 60;
  // Al menos 6 horas, para que un solo tramo corto no se vea como una pared
  if (fin - inicio < 360) [inicio, fin] = [Math.max(0, inicio - 60), Math.min(24 * 60, Math.max(fin, inicio + 360))];
  const paso = fin - inicio > 10 * 60 ? 2 : 1;
  const horas: number[] = [];
  for (let h = inicio / 60; h <= fin / 60; h += paso) horas.push(h);
  const marcas: number[] = [];
  for (let t = inicio; t < fin; t += duracion) marcas.push(t);
  return { inicio, fin, horas, marcas };
}

// El próximo día de esta semana o la siguiente que cae en un cierre (para avisarlo junto al día)
function proximoCierre(dia: number, cerrados: DiaCerrado[], hoy: string) {
  for (let i = 0; i < 14; i += 1) {
    const fecha = sumarDias(hoy, i);
    if (new Date(`${fecha}T12:00:00`).getDay() !== dia) continue;
    const c = cerrados.find((x) => x.desde <= fecha && fecha <= x.hasta);
    if (c) return { fecha, motivo: c.motivo };
  }
  return null;
}

// Motivos que se eligen con un toque en Días cerrados (igual se puede escribir otro)
const MOTIVOS = ['Feriado', 'Vacaciones', 'Capacitación', 'Día no laborable'];
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86_400_000);
const diaYMes = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
// Cuánto falta para un cierre: "Hoy", "Mañana", "En 5 días", "En curso" o "Ya pasó"
function cuandoCierre(c: DiaCerrado, hoy: string): { texto: string; tono: 'neutro' | 'aviso' | 'acento' } {
  if (c.hasta < hoy) return { texto: 'Ya pasó', tono: 'neutro' };
  if (c.desde <= hoy) return { texto: c.desde === c.hasta ? 'Hoy' : 'En curso', tono: 'acento' };
  const faltan = diasEntre(hoy, c.desde);
  return { texto: faltan === 1 ? 'Mañana' : `En ${faltan} días`, tono: faltan <= 7 ? 'aviso' : 'neutro' };
}

// [1, 2, 3] → "Lunes, martes y miércoles"
const listaDias = (dias: number[]) => {
  const nombres = dias.map((d, i) => (i === 0 ? DIAS[d] : DIAS[d].toLowerCase()));
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
};
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const rango = (c: DiaCerrado) => (c.desde === c.hasta ? fechaCorta(c.desde) : `${fechaCorta(c.desde)} al ${fechaCorta(c.hasta)}`);

export default function HorarioVisitasPage() {
  const id = useId();
  const [horario, setHorario] = useState<Editable | null>(null);
  // Lo último guardado, para saber si hay cambios y poder deshacerlos
  const [guardado, setGuardado] = useState<string>('');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fuera, setFuera] = useState<VisitaFueraDeHorario[]>([]);
  const [cierre, setCierre] = useState({ desde: '', hasta: '', motivo: '' });
  // Ayuda "Cómo funciona" desplegada debajo del título
  const [comoFunciona, setComoFunciona] = useState(false);
  // Problema del cierre que se quiere agregar, junto al campo que lo causa
  const [errorCierre, setErrorCierre] = useState<{ campo: 'desde' | 'hasta'; texto: string } | null>(null);
  const campoDesde = useRef<HTMLButtonElement>(null);
  const campoHasta = useRef<HTMLButtonElement>(null);
  // Franja apuntada o en edición: se resalta en el mapa de la semana
  const [editando, setEditando] = useState<string | null>(null);
  // Barra del mapa bajo el mouse ("dia-minutos"): muestra su turno y su franja
  const [barra, setBarra] = useState<string | null>(null);
  // Cuál de los próximos 7 días muestra la vista previa (0 = hoy)
  const [vista, setVista] = useState(0);
  // "Copiar a otros días": de qué día se copia y a cuáles
  const [copiando, setCopiando] = useState<{ desde: number; hacia: number[] } | null>(null);
  // Un momento después de guardar, la barra de abajo lo confirma
  const [recienGuardado, setRecienGuardado] = useState(false);
  // Cambio de duración esperando confirmación (con su efecto ya calculado)
  const [cambioDuracion, setCambioDuracion] = useState<ReturnType<typeof simularDuracion> | null>(null);

  const cargar = () => {
    getHorario()
      .then((datos) => {
        setHorario(datos);
        setGuardado(JSON.stringify(datos));
      })
      .catch((e: Error) => setErrorCarga(e.message || 'No se pudo cargar el horario'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiado = Boolean(horario) && JSON.stringify(horario) !== guardado;

  // Cerrar o recargar la pestaña con cambios sin guardar: el navegador pregunta antes de perderlos
  useEffect(() => {
    if (!cambiado) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [cambiado]);

  useEffect(() => {
    if (!recienGuardado) return;
    const t = setTimeout(() => setRecienGuardado(false), 2500);
    return () => clearTimeout(t);
  }, [recienGuardado]);

  const cambiarTramos = (dia: number, cambio: (tramos: Tramo[]) => Tramo[]) => {
    setErrorGuardar(null);
    setRecienGuardado(false);
    setHorario((h) => h && { ...h, semana: h.semana.map((d, i) => (i === dia ? { tramos: cambio(d.tramos) } : d)) });
  };

  // Copia las franjas de un día a los elegidos (como "Copy times to" de Cal.com)
  const copiar = () => {
    if (!horario || !copiando) return;
    const { desde, hacia } = copiando;
    setErrorGuardar(null);
    setRecienGuardado(false);
    // Sin aviso flotante: la barra de abajo ya dice que hay cambios sin guardar
    setHorario({ ...horario, semana: horario.semana.map((d, i) => (hacia.includes(i) ? { tramos: horario.semana[desde].tramos.map((t) => ({ ...t })) } : d)) });
    setCopiando(null);
  };

  // Hora escrita en una franja. Si el inicio queda en o después del final (o el final antes del inicio), la
  // franja se corre entera con el mismo largo: abrir a las 14 una franja de 9 a 13 la deja de 14 a 18.
  // Si no da turnos enteros o se pisa con otra franja del día, no se acepta y el campo dice por qué.
  const cambiarHora = (dia: number, i: number, campo: 'desde' | 'hasta', valor: string): string | null => {
    if (!horario) return null;
    const dur = horario.duracionMinutos;
    const actual = horario.semana[dia].tramos[i];
    const largo = minutosDe(actual.hasta) - minutosDe(actual.desde);
    let nueva: Tramo = { ...actual, [campo]: valor };
    if (minutosDe(nueva.hasta) <= minutosDe(nueva.desde)) {
      if (campo === 'desde') {
        // Si con el mismo largo se pasa de la medianoche, se acorta a los turnos que entran
        const entran = Math.min(largo, Math.floor((ULTIMO_MINUTO - minutosDe(valor)) / dur) * dur);
        if (entran < dur) return `Una franja que empieza a las ${valor} no llega a tener un turno de ${dur} min antes de la medianoche.`;
        nueva = { desde: valor, hasta: aHora(minutosDe(valor) + entran) };
      } else {
        const entran = Math.min(largo, Math.floor(minutosDe(valor) / dur) * dur);
        if (entran < dur) return `Una franja que termina a las ${valor} no llega a tener un turno de ${dur} min.`;
        nueva = { desde: aHora(minutosDe(valor) - entran), hasta: valor };
      }
    }
    const problema = problemaFranja(nueva, dur, campo);
    if (problema) return problema;
    const pisada = horario.semana[dia].tramos.find((t, j) => j !== i && minutosDe(t.desde) < minutosDe(nueva.hasta) && minutosDe(nueva.desde) < minutosDe(t.hasta));
    if (pisada) return `Quedaría de ${nueva.desde} a ${nueva.hasta} y se pisa con la franja de ${pisada.desde} a ${pisada.hasta}. Cambiá o quitá esa primero.`;
    cambiarTramos(dia, (ts) => ts.map((x, j) => (j === i ? nueva : x)).sort((a, b) => a.desde.localeCompare(b.desde)));
    return null;
  };

  // Cambiar la duración recorta cada franja hasta el último turno completo que entra (y avisa cuántas cambió)
  // Cambiar la duración se confirma antes: muestra cuántos turnos quedan por día y qué franjas se recortan
  const aplicarDuracion = () => {
    if (!horario || !cambioDuracion) return;
    setErrorGuardar(null);
    setRecienGuardado(false);
    setHorario({ ...horario, duracionMinutos: cambioDuracion.duracion, semana: cambioDuracion.semana });
    setCambioDuracion(null);
  };

  const guardar = async () => {
    if (!horario) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const { fueraDeHorario, ...datos } = await guardarHorario(horario);
      setHorario(datos);
      setGuardado(JSON.stringify(datos));
      setFuera(fueraDeHorario);
      setRecienGuardado(true);
    } catch (e) {
      setErrorGuardar(e instanceof Error ? e.message : 'No se pudo guardar el horario');
    } finally {
      setGuardando(false);
    }
  };

  // Valida el cierre nuevo: el problema sale en un globo junto al campo que hay que corregir, que tiembla
  const agregarCierre = (e: FormEvent) => {
    e.preventDefault();
    if (!horario) return;
    const fallar = (campo: 'desde' | 'hasta', texto: string) => {
      setErrorCierre({ campo, texto });
      sacudir((campo === 'desde' ? campoDesde : campoHasta).current);
      (campo === 'desde' ? campoDesde : campoHasta).current?.focus();
    };
    if (!cierre.desde) return fallar('desde', 'Elegí el primer día que la oficina está cerrada.');
    if (cierre.desde < hoy) return fallar('desde', 'Elegí hoy o un día que venga: los cierres pasados no cambian nada.');
    if (cierre.hasta && cierre.hasta < cierre.desde) return fallar('hasta', `Tiene que ser el ${diaYMes(cierre.desde)} o después. Si es un solo día, dejalo vacío.`);
    const hasta = cierre.hasta || cierre.desde;
    const pisado = horario.cerrados.find((c) => c.desde <= hasta && cierre.desde <= c.hasta);
    if (pisado) return fallar('desde', `Ya hay un cierre en esas fechas: ${pisado.motivo || 'Oficina cerrada'} (${rango(pisado)}).`);
    setErrorCierre(null);
    setErrorGuardar(null);
    setRecienGuardado(false);
    setHorario({ ...horario, cerrados: [...horario.cerrados, { desde: cierre.desde, hasta, motivo: cierre.motivo.trim() }].sort((a, b) => a.desde.localeCompare(b.desde)) });
    setCierre({ desde: '', hasta: '', motivo: '' });
  };

  const hoy = hoyIso();
  const diaDeHoy = new Date(`${hoy}T12:00:00`).getDay();
  const eje = ejeDe(horario?.semana ?? [], horario?.duracionMinutos ?? 30);

  // Fechas reales de los próximos 7 días (no días de la semana sueltos): así un feriado se ve cerrado,
  // como lo ve el cliente en la ficha
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const datosDe = (h: Editable, fecha: string) => {
    const dia = new Date(`${fecha}T12:00:00`).getDay();
    const cierre = h.cerrados.find((c) => c.desde <= fecha && fecha <= c.hasta) ?? null;
    return { dia, cierre, turnos: cierre ? [] : turnosDelDia(h.semana[dia].tramos, h.duracionMinutos) };
  };
  // Los próximos 7 días con los turnos que ofrece el horario (no lo que ya pidió alguien: por eso "se ofrecen")
  const semana7 = horario ? fechas.map((f) => ({ fecha: f, ...datosDe(horario, f) })) : [];
  const totalSemana = semana7.reduce((n, d) => n + d.turnos.length, 0);
  const maximoDia = Math.max(1, ...semana7.map((d) => d.turnos.length));

  return (
    <>
      <Encabezado
        titulo="Horario de visitas"
        descripcion="Configurá los días y horarios de atención, la duración de cada turno y los días cerrados. Con esto se arman los turnos que los clientes eligen al agendar una visita."
        acciones={
          <Boton icono="idea" aria-expanded={comoFunciona} aria-controls={`${id}-como`} onClick={() => setComoFunciona((v) => !v)}>
            {comoFunciona ? 'Ocultar ayuda' : 'Cómo funciona'}
          </Boton>
        }
      />

      {/* Cómo funciona: se despliega acá mismo (no tapa la pantalla). Los pasos entran de a uno y la línea que los
          une se dibuja; el del medio muestra la duración actual del turno. */}
      <div
        id={`${id}-como`}
        aria-hidden={!comoFunciona}
        inert={!comoFunciona}
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${comoFunciona ? 'mb-6 grid-rows-[1fr] opacity-100' : 'mb-0 grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="relative rounded-xl bg-panel-acento-suave/60 p-5 ring-1 ring-inset ring-panel-borde">
            <p className="m-0 mb-4 flex items-center gap-2 text-[13px] font-semibold text-panel-acento">
              <Icono nombre="idea" className="h-4 w-4" />
              Cómo funciona, en tres pasos
            </p>
            <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3 sm:gap-0">
              {[
                { icono: 'reloj' as const, titulo: 'Franjas por día', texto: 'Elegís en qué horas recibe visitas la oficina, cada día de la semana.' },
                { icono: 'visitas' as const, titulo: horario ? `Turnos de ${horario.duracionMinutos} min` : 'Turnos', texto: 'Cada franja se reparte en turnos; cada turno es una visita.' },
                { icono: 'calendario' as const, titulo: 'El cliente elige', texto: 'En la ficha ve los turnos libres; los días cerrados no aparecen.' },
              ].map((paso, i) => (
                <li
                  key={i}
                  style={{ transitionDelay: comoFunciona ? `${120 + i * 110}ms` : '0ms' }}
                  className={`relative flex gap-3 transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none sm:flex-col sm:pr-6 ${comoFunciona ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                >
                  {i < 2 && (
                    <span
                      aria-hidden="true"
                      style={{ transitionDelay: comoFunciona ? `${260 + i * 110}ms` : '0ms' }}
                      className={`absolute left-[18px] top-10 bottom-[-16px] w-px origin-top bg-panel-acento/40 transition-transform duration-500 ease-out motion-reduce:transition-none sm:left-11 sm:right-2 sm:top-[18px] sm:bottom-auto sm:h-px sm:w-auto sm:origin-left ${
                        comoFunciona ? 'scale-100' : 'max-sm:scale-y-0 sm:scale-x-0'
                      }`}
                    />
                  )}
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-panel-acento/40 bg-panel-superficie text-panel-acento">
                    <Icono nombre={paso.icono} className="h-[18px] w-[18px]" />
                    <span className="tabular absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-panel-marca text-[10px] font-semibold text-panel-marca-texto">{i + 1}</span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold">{paso.titulo}</span>
                    <span className="text-[13px] leading-snug text-panel-suave">{paso.texto}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {errorCarga && (
        <Alerta tono="peligro" titulo="No se pudo cargar el horario" accion={<Boton tamano="sm" onClick={() => { setErrorCarga(null); cargar(); }}>Reintentar</Boton>}>
          {errorCarga}
        </Alerta>
      )}

      {!horario && !errorCarga ? (
        <Tarjeta>
          <div className="flex flex-col gap-4">
            {ORDEN.map((d) => (
              <Esqueleto key={d} className="h-9 w-full" />
            ))}
          </div>
        </Tarjeta>
      ) : horario ? (
        <div className="grid gap-5 pb-24 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          {/* Estadística de la semana: arriba en el celular, a la derecha (fija al bajar) en pantallas anchas */}
          <aside className="xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
            <Tarjeta>
              <div className="flex flex-col gap-4">
                <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-panel-suave">
                  <Icono nombre="calendario" className="h-4 w-4" />
                  Próximos 7 días
                </span>
                <div>
                  <p className="font-display tabular m-0 text-[56px] leading-[0.9]">{totalSemana}</p>
                  <p className="m-0 mt-2 text-[14px] font-medium leading-snug">
                    {totalSemana === 1 ? 'turno de visita se ofrece' : 'turnos de visita se ofrecen'} a los clientes
                  </p>
                  {cambiado && (
                    <Insignia tono="aviso" className="mt-2">
                      Con los cambios sin guardar
                    </Insignia>
                  )}
                </div>

                {/* Una barra por día, del alto de sus turnos; tocarla muestra ese día en la vista previa */}
                <div className="flex items-end gap-1.5" role="group" aria-label="Turnos por día">
                  {semana7.map((d, i) => (
                    <button
                      key={d.fecha}
                      type="button"
                      onClick={() => setVista(i)}
                      aria-label={`${DIAS[d.dia]} ${Number(d.fecha.slice(8))}: ${d.cierre ? `cerrado${d.cierre.motivo ? `, ${d.cierre.motivo}` : ''}` : plural(d.turnos.length, 'turno', 'turnos')}`}
                      aria-pressed={vista === i}
                      title={d.cierre ? `Cerrado${d.cierre.motivo ? `: ${d.cierre.motivo}` : ''}` : plural(d.turnos.length, 'turno', 'turnos')}
                      className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-panel-acento"
                    >
                      <span className="flex h-16 w-full items-end">
                        <span
                          className={`w-full rounded-[3px] transition-[height,opacity] duration-300 motion-reduce:transition-none ${
                            d.cierre
                              ? 'h-full bg-[repeating-linear-gradient(-45deg,color-mix(in_srgb,var(--color-amber-400)_55%,transparent)_0_3px,transparent_3px_6px)] ring-1 ring-inset ring-amber-300/70 dark:ring-amber-500/50'
                              : d.turnos.length
                                ? `${vista === i ? 'bg-panel-acento' : 'bg-panel-marca group-hover:opacity-75'}`
                                : 'h-1 bg-panel-borde-fuerte'
                          }`}
                          style={!d.cierre && d.turnos.length ? { height: `${Math.max(8, (d.turnos.length / maximoDia) * 100)}%` } : undefined}
                        />
                      </span>
                      <span className={`text-[11px] leading-none ${vista === i ? 'font-semibold text-panel-texto' : 'text-panel-tenue'}`}>{DIAS[d.dia].slice(0, 1)}</span>
                    </button>
                  ))}
                </div>

                {semana7.some((d) => d.cierre) && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px]">
                    {semana7
                      .filter((d) => d.cierre)
                      .map((d) => (
                        <li key={d.fecha} className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px] bg-amber-400" />
                          <span className="min-w-0 truncate">
                            Cerrado el {DIAS[d.dia].slice(0, 3).toLowerCase()} {Number(d.fecha.slice(8))}
                            {d.cierre?.motivo ? ` · ${d.cierre.motivo}` : ''}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}

                <p className="m-0 border-t border-panel-borde pt-3 text-[12.5px] leading-relaxed text-panel-tenue">
                  Cuenta los turnos que abre el horario, no las visitas ya pedidas: esas están en{' '}
                  <Link href="/admin/visitas" className="font-medium text-panel-suave underline underline-offset-2 hover:text-panel-texto">
                    Visitas
                  </Link>
                  .
                </p>
              </div>
            </Tarjeta>
          </aside>

          <div className="flex min-w-0 flex-col gap-5 xl:col-start-1 xl:row-start-1">
          {fuera.length > 0 && (
            <Alerta tono="aviso" titulo={`${plural(fuera.length, 'visita ya pedida queda', 'visitas ya pedidas quedan')} fuera del nuevo horario`}>
              <p className="m-0">Siguen agendadas: coordinalas con cada cliente desde <Link href="/admin/visitas" className="font-medium underline underline-offset-2">Visitas</Link>.</p>
              <ul className="m-0 mt-1.5 flex list-none flex-col gap-0.5 p-0">
                {fuera.slice(0, 8).map((v) => (
                  <li key={v.id} className="tabular">
                    {fechaCorta(v.fecha)}, {v.hora} h · {v.cliente || 'Sin nombre'}
                    {v.propiedad ? ` · ${v.propiedad}` : ''}
                  </li>
                ))}
                {fuera.length > 8 && <li>y {fuera.length - 8} más.</li>}
              </ul>
            </Alerta>
          )}

          {/* Vista previa: lo que ofrece la ficha de una propiedad el día elegido, con los cambios sin guardar incluidos */}
          {(() => {
            const fechaVista = fechas[vista];
            const { dia: diaVista, cierre: cierreVista, turnos: turnosVista } = datosDe(horario, fechaVista);
            const nombreFecha = `${DIAS[diaVista].toLowerCase()} ${Number(fechaVista.slice(8))}`;
            // Igual que en la ficha
            const { manana, tarde } = separarTurnos(turnosVista);
            const grupos = [
              { nombre: 'Mañana', turnos: manana },
              { nombre: 'Tarde', turnos: tarde },
            ].filter((g) => g.turnos.length);
            return (
              <Tarjeta
                titulo="Vista previa: lo que ve un cliente"
                descripcion="Los horarios que aparecen esta semana cuando alguien toca “Agendar una visita” en una propiedad, con los cambios sin guardar incluidos."
                relleno={false}
              >
                <Pestanas
                  etiqueta="Día de la vista previa"
                  className="grid grid-cols-7"
                  activa={vista}
                  alCambiar={setVista}
                  pestanas={fechas.map((f, i) => {
                    const { dia, cierre, turnos: t } = datosDe(horario, f);
                    const estado = cierre ? 'cerrado' : t.length ? plural(t.length, 'turno', 'turnos') : 'no abre';
                    return {
                      id: f,
                      ariaLabel: `${DIAS[dia]} ${Number(f.slice(8))}${i === 0 ? ' (hoy)' : ''}: ${estado}${cierre?.motivo ? `, ${cierre.motivo}` : ''}`,
                      contenido: (
                        <>
                          {/* "Hoy" sobre el día de hoy; en los demás, el mismo alto vacío para que todo quede alineado */}
                          <span aria-hidden="true" className="flex h-4 items-center">
                            {i === 0 && <span className="rounded-full bg-panel-acento px-1.5 text-[10px] font-semibold leading-4 text-white">Hoy</span>}
                          </span>
                          <span className="text-[13px] font-medium">
                            {DIAS[dia].slice(0, 3)} <span className="tabular">{Number(f.slice(8))}</span>
                          </span>
                          <span className={`tabular text-[11.5px] ${cierre ? 'font-medium text-amber-700 dark:text-amber-400' : t.length ? '' : 'text-panel-tenue'}`}>{estado}</span>
                        </>
                      ),
                    };
                  })}
                />
                <div role="tabpanel" className="flex flex-col gap-3 p-5">
                  {cierreVista ? (
                    <Alerta tono="aviso" titulo={`El ${nombreFecha} la oficina está cerrada${cierreVista.motivo ? `: ${cierreVista.motivo}` : ''}`}>
                      Un cliente no encuentra horarios ese día, aunque los {DIAS_PLURAL[diaVista]} se atienda. Para abrirlo, quitalo de Días cerrados.
                    </Alerta>
                  ) : (
                    <p className="m-0 text-[13.5px] text-panel-suave">
                      Un cliente que elige el <span className="font-medium text-panel-texto">{nombreFecha}</span>
                      {turnosVista.length ? ` puede pedir visita en ${plural(turnosVista.length, 'turno', 'turnos')} de ${horario.duracionMinutos} min:` : ' no encuentra turnos: ese día de la semana la oficina no recibe visitas.'}
                    </p>
                  )}
                  {grupos.length > 0 ? (
                    grupos.map((g) => (
                      <div key={g.nombre} className="flex flex-col gap-1.5">
                        <span className="text-[12.5px] text-panel-tenue">
                          {g.nombre} · {plural(g.turnos.length, 'turno', 'turnos')}
                        </span>
                        {/* Solo lectura: se edita en "Días y franjas" */}
                        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                          {g.turnos.map((h) => (
                            <li key={h} className="tabular rounded-full border border-panel-borde-fuerte px-3 py-1 text-[13px]">
                              {h} h
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    !cierreVista && (
                      <Boton tamano="sm" icono="mas" className="self-start" onClick={() => cambiarTramos(diaVista, () => [tramoNuevo(horario.duracionMinutos)])}>
                        Abrir los {DIAS_PLURAL[diaVista]} a la mañana
                      </Boton>
                    )
                  )}
                </div>
              </Tarjeta>
            );
          })()}

          <Tarjeta
            titulo="Días y franjas"
            descripcion="Una franja es un rango de horas en que se reciben visitas; se reparte en turnos. Escribí la hora en cada franja (9:05, 1730…). Las barras muestran cómo queda la semana."
            acciones={
              <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-panel-suave">
                <Icono nombre="reloj" className="h-[18px] w-[18px] text-panel-tenue" />
                Turnos de
                <select
                  value={horario.duracionMinutos}
                  onChange={(e) => setCambioDuracion(simularDuracion(horario, Number(e.target.value)))}
                  className={`${control} max-w-[6.5rem]`}
                >
                  {DURACIONES.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
            }
            relleno={false}
          >
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {/* Eje de horas, común a los siete días: así las filas se alinean y se lee la forma de la semana */}
              <li aria-hidden="true" className="hidden px-5 pb-1 pt-4 md:grid md:grid-cols-[180px_minmax(0,1fr)_88px] md:items-end md:gap-x-4">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-panel-tenue">
                  <Icono nombre="reloj" className="h-3.5 w-3.5" />
                  Hora del día
                </span>
                {/* Cada hora con su rayita, como una regla: se lee que son horas y dónde cae cada una */}
                <span className="tabular relative h-6 text-[11.5px] text-panel-tenue">
                  {eje.horas.map((h) => (
                    <span
                      key={h}
                      className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap first:translate-x-0 first:items-start last:-translate-x-full last:items-end"
                      style={{ left: `${((h * 60 - eje.inicio) / (eje.fin - eje.inicio)) * 100}%` }}
                    >
                      <span>
                        {h}
                        <span className="text-[9.5px]"> h</span>
                      </span>
                      <span className="h-1.5 w-px bg-panel-borde-fuerte" />
                    </span>
                  ))}
                </span>
              </li>
              {ORDEN.map((dia) => {
                const { tramos } = horario.semana[dia];
                const atiende = tramos.length > 0;
                const turnos = turnosDelDia(tramos, horario.duracionMinutos).length;
                const cierreProximo = proximoCierre(dia, horario.cerrados, hoy);
                return (
                  <li key={dia} className="grid gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[180px_minmax(0,1fr)_88px] md:items-center">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        {/* Ficha de almanaque con las dos primeras letras: marca el día sin competir con las barras.
                            Hoy va con el acento; un día cerrado, punteado. */}
                        <span
                          aria-hidden="true"
                          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border ${
                            dia === diaDeHoy
                              ? 'border-panel-acento bg-panel-acento-suave text-panel-acento'
                              : atiende
                                ? 'border-panel-borde-fuerte bg-panel-superficie text-panel-texto'
                                : 'border-dashed border-panel-borde-fuerte text-panel-tenue'
                          }`}
                        >
                          <span className="font-display text-[20px] leading-none">{DIAS[dia].slice(0, 2)}</span>
                          {dia === diaDeHoy && <span className="mt-0.5 text-[9.5px] font-semibold leading-none">hoy</span>}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-[14px] font-medium leading-tight">{DIAS[dia]}</span>
                          {/* La llave es la regla de todas las semanas; un feriado es una excepción y va aparte */}
                          <Interruptor
                            activo={atiende}
                            etiqueta={`Recibe visitas el ${DIAS[dia].toLowerCase()}`}
                            alCambiar={(abre) => cambiarTramos(dia, () => (abre ? [tramoNuevo(horario.duracionMinutos)] : []))}
                          >
                            {atiende ? 'Abre' : 'No abre'}
                          </Interruptor>
                        </span>
                      </div>
                      {cierreProximo && (
                        // Dos renglones (cuándo / por qué): el ancho es el del renglón más largo y no sobra espacio
                        <Insignia tono="aviso" className="max-w-full items-start! self-start py-1">
                          <Icono nombre="alerta" className="mt-px h-3.5 w-3.5 shrink-0" />
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span>Cerrado {cierreProximo.fecha === hoy ? 'hoy' : `el ${Number(cierreProximo.fecha.slice(8))}/${Number(cierreProximo.fecha.slice(5, 7))}`}</span>
                            {cierreProximo.motivo && (
                              <span className="truncate font-normal" title={cierreProximo.motivo}>
                                {cierreProximo.motivo}
                              </span>
                            )}
                          </span>
                        </Insignia>
                      )}
                    </div>

                    {/* Cada barra es un turno, como en la franja de Disponibilidad cada barra es una noche. Es solo un
                        resumen (se edita en los campos de abajo); en el celular no entra y no se muestra. */}
                    <div
                      aria-hidden="true"
                      className="hidden h-9 items-stretch gap-px md:flex"
                      onMouseLeave={() => {
                        setBarra(null);
                        setEditando(null);
                      }}
                    >
                      {eje.marcas.map((t) => {
                        // Barra alta si en ella empieza un turno; baja si cae en una franja que ya no da para otro
                        const dur = horario.duracionMinutos;
                        let inicioTurno = t;
                        const conTurno = tramos.findIndex((x) => {
                          const desde = minutosDe(x.desde);
                          const primero = desde + Math.max(0, Math.ceil((t - desde) / dur)) * dur;
                          if (primero >= t + dur || primero + dur > minutosDe(x.hasta)) return false;
                          inicioTurno = primero;
                          return true;
                        });
                        const i = conTurno >= 0 ? conTurno : tramos.findIndex((x) => minutosDe(x.desde) < t + dur && t < minutosDe(x.hasta));
                        const entero = conTurno >= 0;
                        const editada = i >= 0 && editando === `${dia}-${i}`;
                        const apuntada = barra === `${dia}-${t}`;
                        return (
                          // Pasar el mouse por una barra resalta toda su franja (barras y recuadro de horas), igual que
                          // al apuntar el recuadro, y un globo dice qué turno es y a qué franja pertenece
                          <span
                            key={t}
                            onMouseEnter={() => {
                              setBarra(`${dia}-${t}`);
                              setEditando(i >= 0 ? `${dia}-${i}` : null);
                            }}
                            className="relative flex min-w-0 flex-1 items-end"
                          >
                            <span
                              className={`w-full rounded-[2px] transition-[height,background-color] duration-150 motion-reduce:transition-none ${
                                entero ? `h-full ${editada ? 'bg-panel-acento' : 'bg-panel-marca'}` : i >= 0 ? `h-3 ${editada ? 'bg-panel-acento' : 'bg-panel-borde-fuerte'}` : 'h-1.5 bg-panel-borde'
                              }`}
                            />
                            {apuntada && (
                              <span className="tabular pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-md bg-panel-texto px-2.5 py-1.5 text-center text-[12px] leading-tight text-panel-superficie shadow-[0_6px_16px_-4px_rgba(10,20,40,0.4)]">
                                {entero && <span className="font-semibold">Turno {aHora(inicioTurno)} a {aHora(inicioTurno + dur)}</span>}
                                <span className={entero ? 'opacity-75' : 'font-medium'}>
                                  {i >= 0 ? `Franja ${tramos[i].desde} – ${tramos[i].hasta}` : 'Sin franja: no se atiende'}
                                </span>
                                <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-panel-texto" />
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    <span className={`tabular text-[13px] md:text-right ${atiende ? 'text-panel-suave' : 'text-panel-tenue'}`}>
                      {atiende ? plural(turnos, 'turno', 'turnos') : 'Sin turnos'}
                    </span>

                    {atiende && (
                      // Cada franja es una ficha "09:00 – 13:00 ×": se lee como un rango y se edita en el lugar
                      <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:col-start-2">
                        {tramos.map((t, i) => (
                          <div
                            key={i}
                            role="group"
                            aria-label={`${DIAS[dia]}, franja ${i + 1}`}
                            onFocus={() => setEditando(`${dia}-${i}`)}
                            onBlur={() => setEditando(null)}
                            onMouseEnter={() => setEditando(`${dia}-${i}`)}
                            onMouseLeave={() => setEditando(null)}
                            className={`flex items-center gap-0.5 rounded-lg border bg-panel-hundido py-0.5 pl-1 pr-0.5 transition-colors duration-150 ${
                              editando === `${dia}-${i}` ? 'border-panel-acento' : 'border-panel-borde'
                            }`}
                          >
                            <CampoHora key={`d${t.desde}`} etiqueta="Desde" valor={t.desde} alCambiar={(v) => cambiarHora(dia, i, 'desde', v)} />
                            <span aria-hidden="true" className="text-panel-tenue">
                              –
                            </span>
                            <CampoHora key={`h${t.hasta}`} etiqueta="Hasta" valor={t.hasta} alCambiar={(v) => cambiarHora(dia, i, 'hasta', v)} />
                            <button
                              type="button"
                              aria-label={`Quitar la franja de ${t.desde} a ${t.hasta} del ${DIAS[dia].toLowerCase()}`}
                              title="Quitar franja"
                              onClick={() => cambiarTramos(dia, (ts) => ts.filter((_, j) => j !== i))}
                              className="-my-2 ml-0.5 rounded-md p-[15px] text-panel-tenue transition-colors hover:bg-panel-superficie sm:my-0 sm:p-1.5 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Icono nombre="cerrar" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {tramos.length < TRAMOS_POR_DIA && (
                          <button
                            type="button"
                            onClick={() => cambiarTramos(dia, (ts) => [...ts, franjaSiguiente(ts, horario.duracionMinutos)])}
                            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed border-panel-borde-fuerte px-3 py-1.5 text-[13px] sm:min-h-0 text-panel-suave transition-colors hover:bg-panel-hundido hover:text-panel-texto"
                          >
                            <Icono nombre="mas" className="h-4 w-4" />
                            Franja
                          </button>
                        )}
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          icono="copiar"
                          className="max-sm:h-11"
                          onClick={() => setCopiando({ desde: dia, hacia: [] })}
                          aria-label={`Copiar el horario del ${DIAS[dia].toLowerCase()} a otros días`}
                        >
                          Copiar a…
                        </Boton>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          <Tarjeta
            titulo={
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <Icono nombre="calendario" className="h-4 w-4" />
                </span>
                Días cerrados
              </span>
            }
            descripcion="Feriados y vacaciones: esos días no se ofrecen turnos, aunque normalmente se atienda."
          >
            {/* Formulario en un recuadro ámbar suave: el color de "cerrado" en toda la pantalla */}
            <form onSubmit={agregarCierre} noValidate className="flex flex-col gap-3 rounded-xl bg-amber-50/70 p-4 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-950/20 dark:ring-amber-900/60">
              <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,10rem))_minmax(0,1fr)] sm:items-start">
                {(['desde', 'hasta'] as const).map((campo) => {
                  const conError = errorCierre?.campo === campo;
                  const ref = campo === 'desde' ? campoDesde : campoHasta;
                  return (
                    <Campo key={campo} etiqueta={campo === 'desde' ? 'Desde' : 'Hasta'} htmlFor={`${id}-${campo}`} ayuda={campo === 'hasta' ? 'Vacío = un solo día' : undefined}>
                      <span className="relative block">
                        <SelectorFecha
                          campoRef={ref}
                          id={`${id}-${campo}`}
                          invalido={conError}
                          describedBy={conError ? `${id}-error-cierre` : undefined}
                          min={campo === 'desde' ? hoy : cierre.desde || hoy}
                          placeholder={campo === 'desde' ? 'Elegir día' : 'Mismo día'}
                          valor={cierre[campo]}
                          alCambiar={(valor) => {
                            setCierre((c) => ({ ...c, [campo]: valor }));
                            if (conError) setErrorCierre(null);
                          }}
                          marcados={(iso) => horario.cerrados.some((c) => c.desde <= iso && iso <= c.hasta)}
                          rangoDesde={campo === 'hasta' ? cierre.desde || undefined : undefined}
                        />
                        {conError && (
                          <GloboError id={`${id}-error-cierre`} ancla={ref}>
                            {errorCierre.texto}
                          </GloboError>
                        )}
                      </span>
                    </Campo>
                  );
                })}
                <Campo etiqueta="Motivo (opcional)" htmlFor={`${id}-motivo`}>
                  <input id={`${id}-motivo`} type="text" maxLength={100} placeholder="Feriado, vacaciones…" value={cierre.motivo} onChange={(e) => setCierre({ ...cierre, motivo: e.target.value })} className={control} />
                </Campo>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-panel-suave">Motivos rápidos:</span>
                {MOTIVOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={cierre.motivo === m}
                    onClick={() => setCierre({ ...cierre, motivo: cierre.motivo === m ? '' : m })}
                    className={`min-h-11 rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 ring-inset sm:min-h-0 transition-colors ${
                      cierre.motivo === m
                        ? 'bg-amber-400 text-amber-950 ring-amber-500'
                        : 'bg-panel-superficie text-panel-suave ring-panel-borde-fuerte hover:text-panel-texto hover:ring-amber-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <Boton type="submit" variante="principal" icono="mas" className="ml-auto max-sm:w-full">
                  Agregar cierre
                </Boton>
              </div>
            </form>

            {horario.cerrados.length === 0 ? (
              <EstadoVacio icono="calendario" titulo="Sin días cerrados por ahora" texto="Cuando cargues un feriado o tus vacaciones, aparecen acá como hojas de almanaque y ese día no se ofrecen turnos." />
            ) : (
              // Cada cierre es una hoja de almanaque: el día grande a la izquierda, el motivo y cuánto falta a la derecha
              <ul className="m-0 mt-4 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3 p-0">
                {horario.cerrados.map((c, i) => {
                  const cuando = cuandoCierre(c, hoy);
                  const paso = c.hasta < hoy;
                  const inicio = new Date(`${c.desde}T12:00:00`);
                  const largo = diasEntre(c.desde, c.hasta) + 1;
                  return (
                    <li
                      key={`${c.desde}-${i}`}
                      className={`flex items-stretch overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie shadow-[0_1px_2px_rgba(10,20,40,0.06)] ${paso ? 'opacity-60 grayscale' : ''}`}
                    >
                      <span aria-hidden="true" className="flex w-[4.5rem] shrink-0 flex-col items-center overflow-hidden border-r border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
                        <span className="w-full bg-amber-500 py-0.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white dark:bg-amber-600">
                          {inicio.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="font-display tabular flex flex-1 items-center text-[30px] leading-none text-amber-900 dark:text-amber-200">{inicio.getDate()}</span>
                        <span className="pb-1.5 text-[10.5px] capitalize text-amber-700 dark:text-amber-400">{inicio.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-2.5">
                        <span className="truncate text-[14px] font-semibold" title={c.motivo || undefined}>
                          {c.motivo || 'Oficina cerrada'}
                        </span>
                        <span className="tabular text-[12.5px] text-panel-suave">
                          {largo === 1 ? 'Solo ese día' : `Hasta el ${diaYMes(c.hasta)} · ${largo} días`}
                        </span>
                        <Insignia tono={cuando.tono} className="self-start">
                          {cuando.texto}
                        </Insignia>
                      </span>
                      <span className="flex items-start p-1.5">
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          icono="borrar"
                          aria-label={`Quitar el cierre del ${rango(c)}`}
                          onClick={() => {
                            setErrorGuardar(null);
                            setRecienGuardado(false);
                            setHorario({ ...horario, cerrados: horario.cerrados.filter((_, j) => j !== i) });
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          {/* Barra de guardado: aparece solo con cambios, siempre a mano aunque la página sea larga. Va en el azul
              oscuro del menú (no en el blanco de las tarjetas) y el botón en el acento, para que no pase desapercibida. */}
          {(cambiado || errorGuardar || recienGuardado) && (
            // Borde con brillo del color del estado (ámbar = sin guardar, rojo = error, verde = guardado), en los dos
            // modos. En oscuro el azul del menú se pierde contra el fondo: además se tiñe con ese color.
            <div
              className={`sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl bg-panel-menu px-4 py-3 text-white ring-2 sm:flex-row sm:items-center ${
                errorGuardar
                  ? 'shadow-[0_0_0_4px_rgba(248,113,113,0.18),0_0_26px_-2px_rgba(248,113,113,0.5),0_12px_32px_-8px_rgba(5,12,30,0.55)] ring-red-400/80 dark:bg-[color-mix(in_srgb,var(--p-superficie)_80%,#ef4444)]'
                  : recienGuardado
                    ? 'shadow-[0_0_0_4px_rgba(52,211,153,0.18),0_0_26px_-2px_rgba(52,211,153,0.5),0_12px_32px_-8px_rgba(5,12,30,0.55)] ring-emerald-400/80 dark:bg-[color-mix(in_srgb,var(--p-superficie)_82%,#10b981)]'
                    : 'shadow-[0_0_0_4px_rgba(251,191,36,0.18),0_0_26px_-2px_rgba(251,191,36,0.5),0_12px_32px_-8px_rgba(5,12,30,0.55)] ring-amber-400/80 dark:bg-[color-mix(in_srgb,var(--p-superficie)_80%,#f59e0b)]'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5 text-[13.5px]" role={errorGuardar ? 'alert' : 'status'}>
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${errorGuardar ? 'bg-red-400' : recienGuardado ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {errorGuardar ? (
                  <span className="text-red-200">{errorGuardar}</span>
                ) : recienGuardado ? (
                  <span>
                    <span className="font-semibold">Horario guardado.</span> <span className="text-white/70">El calendario de visitas ya ofrece los turnos nuevos.</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold">Tenés cambios sin guardar.</span> <span className="text-white/70">Los clientes siguen viendo el horario anterior.</span>
                  </span>
                )}
              </div>
              {cambiado && (
                <div className="flex gap-2">
                  <Boton
                    disabled={guardando}
                    onClick={() => {
                      setHorario(JSON.parse(guardado));
                      setErrorGuardar(null);
                    }}
                  >
                    Deshacer
                  </Boton>
                  <Boton variante="acento" icono="check" cargando={guardando} onClick={guardar}>
                    Guardar horario
                  </Boton>
                </div>
              )}
            </div>
          )}

          <Dialogo
            abierto={cambioDuracion !== null}
            alCerrar={() => setCambioDuracion(null)}
            titulo={cambioDuracion ? `¿Pasar a turnos de ${cambioDuracion.duracion} min?` : ''}
            descripcion="Cambia todos los días a la vez: cada franja se vuelve a repartir en turnos de la nueva duración."
            acciones={
              <>
                <Boton onClick={() => setCambioDuracion(null)}>Dejar {horario.duracionMinutos} min</Boton>
                <Boton variante="principal" icono="reloj" onClick={aplicarDuracion} autoFocus>
                  Pasar a {cambioDuracion?.duracion} min
                </Boton>
              </>
            }
          >
            {cambioDuracion && (
              <div className="flex flex-col gap-4">
                {/* El número grande: lo que más cambia y lo que el admin tiene que ver primero */}
                <div className="flex items-center gap-3 rounded-lg bg-panel-hundido px-4 py-3">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[12.5px] text-panel-suave">Turnos por semana</span>
                    <span className="tabular flex items-baseline gap-2 text-[22px] font-semibold leading-none">
                      <span className="text-panel-tenue line-through decoration-1">{cambioDuracion.antes}</span>
                      <span aria-hidden="true" className="text-[16px] text-panel-tenue">→</span>
                      <span>{cambioDuracion.despues}</span>
                      <span className="sr-only">
                        Pasa de {cambioDuracion.antes} a {cambioDuracion.despues} turnos por semana.
                      </span>
                    </span>
                  </span>
                  {cambioDuracion.despues !== cambioDuracion.antes && (
                    <Insignia tono={cambioDuracion.despues > cambioDuracion.antes ? 'exito' : 'aviso'}>
                      {cambioDuracion.despues > cambioDuracion.antes ? '+' : '−'}
                      {Math.abs(cambioDuracion.despues - cambioDuracion.antes)} turnos
                    </Insignia>
                  )}
                </div>

                <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 text-[13.5px] sm:grid-cols-2">
                  {cambioDuracion.porDia.map((d) => (
                    <li key={d.dia} className="flex items-center justify-between gap-3 border-b border-panel-borde py-1.5">
                      <span>{DIAS[d.dia]}</span>
                      <span className="tabular text-panel-suave">
                        {d.antes} → <span className={d.despues < d.antes ? 'font-semibold text-panel-texto' : 'text-panel-texto'}>{d.despues}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {cambioDuracion.ajustes.length > 0 && (
                  <Alerta tono="aviso" titulo={`${plural(cambioDuracion.recortadas, 'franja se recorta', 'franjas se recortan')} para terminar justo en un turno`}>
                    <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                      {cambioDuracion.ajustes.map((a, i) => (
                        <li key={i} className="tabular">
                          <span className="font-medium">{listaDias(a.dias)}:</span> {a.antes.desde}–{a.antes.hasta} →{' '}
                          {a.despues ? `${a.despues.desde}–${a.despues.hasta}` : 'se quita (no entra ningún turno)'}
                        </li>
                      ))}
                    </ul>
                  </Alerta>
                )}

                <p className="m-0 text-[12.5px] leading-relaxed text-panel-tenue">
                  Las visitas ya pedidas conservan su duración. Nada cambia para los clientes hasta que guardes.
                </p>
              </div>
            )}
          </Dialogo>

          <Dialogo
            abierto={copiando !== null}
            alCerrar={() => setCopiando(null)}
            titulo={copiando ? `Copiar el horario del ${DIAS[copiando.desde].toLowerCase()}` : ''}
            descripcion={
              copiando
                ? `${horario.semana[copiando.desde].tramos.map((t) => `${t.desde} a ${t.hasta}`).join(' y ')}. Reemplaza las franjas de los días que elijas.`
                : undefined
            }
            acciones={
              <>
                <Boton onClick={() => setCopiando(null)}>Cancelar</Boton>
                <Boton variante="principal" icono="copiar" disabled={!copiando?.hacia.length} onClick={copiar}>
                  Copiar
                </Boton>
              </>
            }
          >
            {copiando && (
              <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
                <legend className="mb-2 text-[13px] text-panel-suave">Copiar a:</legend>
                {ORDEN.filter((d) => d !== copiando.desde).map((d) => (
                  <label key={d} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[14px] hover:bg-panel-hundido">
                    <input
                      type="checkbox"
                      checked={copiando.hacia.includes(d)}
                      onChange={(e) => setCopiando({ ...copiando, hacia: e.target.checked ? [...copiando.hacia, d] : copiando.hacia.filter((x) => x !== d) })}
                      className="h-4 w-4 accent-[var(--color-panel-acento)]"
                    />
                    <span className="flex-1">{DIAS[d]}</span>
                    <span className="tabular text-[12.5px] text-panel-tenue">
                      {horario.semana[d].tramos.length ? horario.semana[d].tramos.map((t) => `${t.desde}–${t.hasta}`).join(', ') : 'No abre'}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </Dialogo>
          </div>
        </div>
      ) : null}
    </>
  );
}
