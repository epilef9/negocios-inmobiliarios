"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TarjetaPropiedad from "@/components/sitio/TarjetaPropiedad";
import { useDolarBlue } from "@/components/sitio/precio";
import { obtenerPropiedades } from "@/components/sitio/datos";
import type { ApiProperty } from "@/services/api";

// Propiedades de una localidad. Llegan armadas desde el servidor; si el servidor no pudo leerlas, se piden acá.
export default function ListadoLocalidad({ iniciales, categoria, coincide }: { iniciales: ApiProperty[] | null; categoria: string; coincide: string }) {
	const blue = useDolarBlue();
	const [lista, setLista] = useState<ApiProperty[] | null>(iniciales);

	useEffect(() => {
		if (iniciales) return;
		let activo = true;
		obtenerPropiedades()
			.then((todas) =>
				activo &&
				setLista(todas.filter((p) => p.categoria_operacion === categoria && `${p.ciudad ?? ""} ${p.location ?? ""}`.toLocaleLowerCase("es").includes(coincide)))
			)
			.catch(() => activo && setLista([]));
		return () => {
			activo = false;
		};
	}, [iniciales, categoria, coincide]);

	if (!lista) {
		return (
			<div aria-busy="true" className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
				<span className="calma-brillo h-72 w-full" />
				<span className="calma-brillo h-72 w-full" />
				<span className="calma-brillo h-72 w-full" />
			</div>
		);
	}
	if (lista.length === 0) {
		return (
			<div className="flex flex-col items-start gap-5 border-y border-[#efe9df]/15 py-12">
				<p className="font-display m-0 max-w-2xl text-[clamp(26px,3vw,38px)] leading-tight">Por ahora no hay publicaciones de este tipo en la zona.</p>
				<Link href="/contacto" className="calma-micro calma-link text-[#efe9df]">
					Contanos qué buscás y te avisamos
				</Link>
			</div>
		);
	}
	return (
		<ul className="m-0 grid list-none gap-x-6 gap-y-14 p-0 sm:grid-cols-2 lg:grid-cols-3">
			{lista.map((p) => (
				<li key={p._id}>
					<TarjetaPropiedad propiedad={p} blue={blue} revelar={false} />
				</li>
			))}
		</ul>
	);
}
