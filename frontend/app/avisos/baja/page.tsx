"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SitioBase from "@/components/sitio/SitioBase";
import { bajaDeAviso } from "@/services/avisos";

// Baja de un aviso desde el link del mail, sin ingresar
function Baja() {
	const token = useSearchParams().get("token") || "";
	const [estado, setEstado] = useState<"procesando" | "listo" | "error">(token ? "procesando" : "error");
	const [mensaje, setMensaje] = useState(token ? "" : "El link de baja está incompleto.");

	useEffect(() => {
		if (!token) return;
		let activo = true;
		bajaDeAviso(token)
			.then(() => activo && setEstado("listo"))
			.catch((e: Error) => {
				if (!activo) return;
				setMensaje(e.message);
				setEstado("error");
			});
		return () => {
			activo = false;
		};
	}, [token]);

	return (
		<section className="flex flex-col items-start gap-6 px-5 pb-24 pt-36 sm:px-10">
			<h1 className="font-display m-0 max-w-3xl text-[clamp(40px,5vw,72px)] font-normal leading-none" aria-live="polite">
				{estado === "procesando" ? "Dándote de baja…" : estado === "listo" ? "Listo, no te vamos a escribir más por este aviso." : "No pudimos darte de baja."}
			</h1>
			{estado === "error" && <p className="m-0 text-[16px] text-[#efe9df]/70">{mensaje || "Probá de nuevo o quitá el aviso desde Mi cuenta."}</p>}
			<Link href="/avisos" className="calma-micro calma-link">
				Ver mis avisos
			</Link>
		</section>
	);
}

export default function BajaAvisoPage() {
	return (
		<SitioBase pieSimple>
			<Suspense fallback={null}>
				<Baja />
			</Suspense>
		</SitioBase>
	);
}
