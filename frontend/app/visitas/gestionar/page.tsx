"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import CalendarioVisita from "@/components/detalle/CalendarioVisita";
import { botonCompacto } from "@/components/cuenta/PantallaCuenta";
import { useContacto } from "@/components/sitio/useAjustes";
import {
	cancelarVisitaPorEnlace,
	reprogramarVisitaPorEnlace,
	verVisitaPorEnlace,
	type EstadoVisita,
	type VisitaGestion,
} from "@/services/visitas";

// Destino del botón "Gestionar mi visita" del mail: ver la visita, cancelarla o pedir otro horario, sin cuenta.
// El token llega en el fragmento (#t=…), que el navegador no manda al servidor: así no queda en ningún log.

const ESTADOS: Record<EstadoVisita, string> = {
	pendiente: "Pendiente de confirmación",
	confirmada: "Confirmada",
	reprogramada: "Reprogramada",
	rechazada: "Rechazada",
	cancelada: "Cancelada",
};

const secundario =
	"calma-micro cursor-pointer rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] transition-colors duration-300 hover:border-[#efe9df] disabled:cursor-wait disabled:opacity-60";
const control =
	"w-full rounded-xl border border-[#efe9df]/25 bg-[#0b2048] px-4 py-3 text-[16px] text-[#efe9df] placeholder:text-[#efe9df]/40 focus-visible:border-[#efe9df] focus-visible:outline-none";

const fechaLarga = (iso: string) =>
	new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

const tokenDelEnlace = () => new URLSearchParams(window.location.hash.slice(1)).get("t") || "";

function Gestionar() {
	const { whatsappUrl } = useContacto();
	const [token, setToken] = useState("");
	const [visita, setVisita] = useState<VisitaGestion | null>(null);
	const [estado, setEstado] = useState<"cargando" | "lista" | "invalido">("cargando");
	const [modo, setModo] = useState<"ver" | "cancelar" | "reprogramar">("ver");
	const [motivo, setMotivo] = useState("");
	const [turno, setTurno] = useState({ fecha: "", horario: "" });
	// Cambia para que el calendario vuelva a consultar la agenda (por ejemplo, si el turno se ocupó)
	const [vueltaAgenda, setVueltaAgenda] = useState(0);
	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState("");
	const [aviso, setAviso] = useState("");
	const leido = useRef(false);

	useEffect(() => {
		if (leido.current) return;
		leido.current = true;
		const t = tokenDelEnlace();
		(t ? verVisitaPorEnlace(t) : Promise.reject(new Error("")))
			.then(({ visita: v }) => {
				setToken(t);
				setVisita(v);
				setEstado("lista");
			})
			.catch((e: Error) => {
				setError(e.message);
				setEstado("invalido");
			});
	}, []);

	const cancelar = async () => {
		setEnviando(true);
		setError("");
		try {
			const { visita: v } = await cancelarVisitaPorEnlace(token, motivo.trim());
			setVisita(v);
			setModo("ver");
			setAviso("Cancelaste la visita. El horario quedó libre y ya le avisamos a la inmobiliaria.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "No pudimos cancelar la visita.");
		} finally {
			setEnviando(false);
		}
	};

	const reprogramar = async () => {
		if (!turno.fecha || !turno.horario) {
			setError("Elegí un día y un horario.");
			return;
		}
		setEnviando(true);
		setError("");
		try {
			const { visita: v, token: nuevo } = await reprogramarVisitaPorEnlace(token, turno.fecha, turno.horario);
			setVisita(v);
			// El enlace anterior dejó de valer: se reemplaza por el nuevo (el mismo que llega por mail)
			if (nuevo) {
				setToken(nuevo);
				window.history.replaceState(null, "", `#t=${nuevo}`);
			}
			setModo("ver");
			setTurno({ fecha: "", horario: "" });
			setAviso("Listo, pediste el nuevo horario. Te mandamos un mail y te avisamos cuando lo confirmemos.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "No pudimos cambiar el horario.");
			if ((e as { code?: string }).code === "HORARIO_NO_DISPONIBLE") {
				setTurno((t) => ({ ...t, horario: "" }));
				setVueltaAgenda((n) => n + 1);
			}
		} finally {
			setEnviando(false);
		}
	};

	if (estado === "cargando") {
		return (
			<p role="status" className="m-0 text-[17px] text-[#efe9df]/80">
				Buscando tu visita…
			</p>
		);
	}

	if (estado === "invalido" || !visita) {
		return (
			<div role="alert" className="flex max-w-xl flex-col items-start gap-6">
				<p className="m-0 text-[17px] leading-relaxed text-[#efe9df]/80">
					{error || "Este enlace no es válido o ya venció. Si necesitás cambiar tu visita, escribinos por WhatsApp."}
				</p>
				<a href={whatsappUrl} target="_blank" rel="noreferrer" className={botonCompacto}>
					Escribir por WhatsApp
				</a>
			</div>
		);
	}

	const sigueVigente = visita.cancelable;

	return (
		<div className="flex w-full max-w-xl flex-col gap-8">
			<div className="flex flex-col gap-4 border-t border-[#efe9df]/20 pt-8">
				<p className="calma-micro m-0 text-[#efe9df]/60">{ESTADOS[visita.estado]}</p>
				<p className="font-display m-0 text-[clamp(26px,3vw,36px)] leading-tight first-letter:uppercase">
					{visita.fecha ? fechaLarga(visita.fecha) : "Día a confirmar"}
					{visita.horario && <span className="text-[#efe9df]/60"> · {visita.horario} h</span>}
				</p>
				<div className="flex flex-col gap-1 text-[16px] text-[#efe9df]/80">
					{visita.propiedad.id ? (
						<Link href={`/propiedades/${visita.propiedad.id}`} className="calma-link self-start">
							{visita.propiedad.titulo}
						</Link>
					) : (
						<span>{visita.propiedad.titulo}</span>
					)}
					{visita.propiedad.direccion && <span className="text-[#efe9df]/60">{visita.propiedad.direccion}</span>}
				</div>
			</div>

			{aviso && (
				<p role="status" className="m-0 flex items-start gap-3 text-[16px] leading-relaxed">
					<span className="calma-dot mt-2 shrink-0" aria-hidden="true" />
					{aviso}
				</p>
			)}

			{!sigueVigente && !aviso && (
				<p className="m-0 text-[16px] leading-relaxed text-[#efe9df]/70">
					Esta visita ya no se puede cambiar desde acá. Si necesitás algo,{" "}
					<a href={whatsappUrl} target="_blank" rel="noreferrer" className="calma-link">
						escribinos por WhatsApp
					</a>
					.
				</p>
			)}

			{sigueVigente && modo === "ver" && (
				<div className="flex flex-wrap gap-3">
					<button type="button" className={secundario} onClick={() => { setModo("reprogramar"); setError(""); setAviso(""); }}>
						Pedir otro horario
					</button>
					<button type="button" className={secundario} onClick={() => { setModo("cancelar"); setError(""); setAviso(""); }}>
						Cancelar la visita
					</button>
				</div>
			)}

			{sigueVigente && modo === "cancelar" && (
				<div className="flex flex-col gap-4">
					<label htmlFor="motivo" className="calma-micro text-[#efe9df]/70">
						¿Querés contarnos por qué? (opcional)
					</label>
					<textarea id="motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={control} />
					<div className="flex flex-wrap gap-3">
						<button type="button" onClick={cancelar} disabled={enviando} className={botonCompacto}>
							{enviando ? "Cancelando…" : "Sí, cancelar la visita"}
						</button>
						<button type="button" onClick={() => setModo("ver")} disabled={enviando} className={secundario}>
							Volver
						</button>
					</div>
				</div>
			)}

			{sigueVigente && modo === "reprogramar" && (
				<div className="flex flex-col gap-6">
					<CalendarioVisita key={vueltaAgenda} fecha={turno.fecha} horario={turno.horario} onCambiar={setTurno} />
					<p className="m-0 text-[14px] text-[#efe9df]/60">El nuevo horario queda pendiente hasta que la inmobiliaria lo confirme.</p>
					<div className="flex flex-wrap gap-3">
						<button type="button" onClick={reprogramar} disabled={enviando || !turno.horario} className={botonCompacto}>
							{enviando ? "Guardando…" : "Pedir este horario"}
						</button>
						<button type="button" onClick={() => setModo("ver")} disabled={enviando} className={secundario}>
							Volver
						</button>
					</div>
				</div>
			)}

			{error && estado === "lista" && (
				<p role="alert" className="m-0 text-[15px] text-[#ff8a7d]">
					{error}
				</p>
			)}
		</div>
	);
}

export default function GestionarVisitaPage() {
	return (
		<SitioBase pieSimple>
			<section className="flex flex-col items-start gap-10 px-5 pb-24 pt-36 sm:px-10">
				<h1 className="font-display m-0 text-[clamp(40px,5vw,72px)] font-normal leading-none">Tu visita.</h1>
				<Gestionar />
			</section>
		</SitioBase>
	);
}
