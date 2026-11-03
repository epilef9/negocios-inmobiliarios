"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { botonCompacto } from "@/components/cuenta/PantallaCuenta";
import { useContacto } from "@/components/sitio/useAjustes";
import { responderAsistenciaPorEnlace, verAsistenciaPorEnlace, type RespuestaAsistencia, type VisitaGestion } from "@/services/visitas";

// Destino de los botones "Confirmo" / "No voy a poder" del recordatorio del día anterior. La respuesta se registra
// recién al tocar el botón de esta página: algunos correos abren los enlaces solos para revisarlos, y eso no
// tiene que gastar el enlace (es de un solo uso) ni cancelar la visita.
// El token llega en el fragmento (#t=…&r=…), que el navegador no manda al servidor.

const secundario =
	"calma-micro cursor-pointer rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] transition-colors duration-300 hover:border-[#efe9df] disabled:cursor-wait disabled:opacity-60";

const fechaLarga = (iso: string) =>
	new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

const leerEnlace = () => {
	const datos = new URLSearchParams(window.location.hash.slice(1));
	return { token: datos.get("t") || "", respuesta: (datos.get("r") === "no_voy" ? "no_voy" : "confirmo") as RespuestaAsistencia };
};

function Asistencia() {
	const { whatsappUrl } = useContacto();
	const [token, setToken] = useState("");
	const [eleccion, setEleccion] = useState<RespuestaAsistencia>("confirmo");
	const [visita, setVisita] = useState<VisitaGestion | null>(null);
	const [estado, setEstado] = useState<"cargando" | "lista" | "respondida" | "invalido">("cargando");
	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState("");
	const leido = useRef(false);

	useEffect(() => {
		if (leido.current) return;
		leido.current = true;
		const enlace = leerEnlace();
		(enlace.token ? verAsistenciaPorEnlace(enlace.token) : Promise.reject(new Error("")))
			.then(({ visita: v }) => {
				setToken(enlace.token);
				setEleccion(enlace.respuesta);
				setVisita(v);
				setEstado(v.cancelable ? "lista" : "invalido");
			})
			.catch((e: Error) => {
				setError(e.message);
				setEstado("invalido");
			});
	}, []);

	const responder = async () => {
		setEnviando(true);
		setError("");
		try {
			const { visita: v } = await responderAsistenciaPorEnlace(token, eleccion);
			setVisita(v);
			setEstado("respondida");
		} catch (e) {
			setError(e instanceof Error ? e.message : "No pudimos registrar tu respuesta.");
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

	const cuando = `${visita.fecha ? fechaLarga(visita.fecha) : "el día acordado"}${visita.horario ? ` a las ${visita.horario} h` : ""}`;

	return (
		<div className="flex w-full max-w-xl flex-col gap-8">
			<div className="flex flex-col gap-4 border-t border-[#efe9df]/20 pt-8">
				<p className="font-display m-0 text-[clamp(26px,3vw,36px)] leading-tight first-letter:uppercase">{cuando}</p>
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

			{estado === "respondida" ? (
				<p role="status" className="m-0 flex items-start gap-3 text-[17px] leading-relaxed">
					<span className="calma-dot mt-2.5 shrink-0" aria-hidden="true" />
					{eleccion === "confirmo"
						? `¡Gracias${visita.nombre ? `, ${visita.nombre}` : ""}! Te esperamos.`
						: "Listo, cancelamos tu visita y el horario quedó libre. Si querés, podés pedir otra desde la ficha de la propiedad."}
				</p>
			) : (
				<div className="flex flex-col gap-5">
					<p className="m-0 text-[17px] leading-relaxed">
						{eleccion === "confirmo"
							? "¿Confirmás que vas a venir?"
							: "¿Seguro que no vas a poder venir? Vamos a cancelar la visita y darle el horario a otra persona."}
					</p>
					<div className="flex flex-wrap gap-3">
						<button type="button" onClick={responder} disabled={enviando} className={botonCompacto}>
							{enviando ? "Guardando…" : eleccion === "confirmo" ? "Sí, voy a ir" : "Sí, no voy a poder"}
						</button>
						<button type="button" onClick={() => setEleccion(eleccion === "confirmo" ? "no_voy" : "confirmo")} disabled={enviando} className={secundario}>
							{eleccion === "confirmo" ? "En realidad no voy a poder" : "En realidad sí voy"}
						</button>
					</div>
					{error && (
						<p role="alert" className="m-0 text-[15px] text-[#ff8a7d]">
							{error}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export default function AsistenciaVisitaPage() {
	return (
		<SitioBase pieSimple>
			<section className="flex flex-col items-start gap-10 px-5 pb-24 pt-36 sm:px-10">
				<h1 className="font-display m-0 text-[clamp(40px,5vw,72px)] font-normal leading-none">Tu visita de mañana.</h1>
				<Asistencia />
			</section>
		</SitioBase>
	);
}
