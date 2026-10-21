"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import TarjetaPropiedad from "@/components/sitio/TarjetaPropiedad";
import { useDolarBlue } from "@/components/sitio/precio";
import { useFavoritos } from "@/components/sitio/favoritos";
import { useAuth } from "@/context/AuthContext";
import { getFavoritosDetalle } from "@/services/favoritos";
import type { ApiProperty } from "@/services/api";

// Propiedades que el usuario guardó en su cuenta
export default function FavoritosPage() {
	const { user, isLoading } = useAuth();
	const { favoritos } = useFavoritos();
	const blue = useDolarBlue();
	const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
	const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

	useEffect(() => {
		if (isLoading || !user) return;
		let activo = true;
		getFavoritosDetalle()
			.then((datos) => {
				if (!activo) return;
				setPropiedades(datos ?? []);
				setEstado("listo");
			})
			.catch(() => activo && setEstado("error"));
		return () => {
			activo = false;
		};
	}, [user, isLoading]);

	// Al quitar un corazón desde esta página, la tarjeta desaparece sin recargar
	const visibles = useMemo(() => propiedades.filter((p) => favoritos.has(p._id)), [propiedades, favoritos]);

	const enlaceBoton = "calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white";

	return (
		<SitioBase>
			<header className="encabezado-color encabezado-rojo flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
				<h1 className="font-display m-0 text-[clamp(56px,8vw,128px)] font-normal leading-[0.9] tracking-[-0.02em]">Mis favoritos</h1>
				{user && estado === "listo" && visibles.length > 0 && (
					<p className="m-0 pb-3 text-[15px] text-[#efe9df]/70">
						{visibles.length === 1 ? "1 propiedad guardada" : `${visibles.length} propiedades guardadas`}
					</p>
				)}
			</header>

			<section aria-label="Propiedades guardadas" className="px-5 pb-20 sm:px-10">
				{!isLoading && !user ? (
					<div className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
						<p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">Ingresá para ver las propiedades que guardaste.</p>
						<p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/70">Tus favoritos quedan en tu cuenta, así los ves desde cualquier dispositivo.</p>
						<div className="flex flex-wrap gap-3">
							<Link href="/login?volver=/favoritos" className={enlaceBoton}>
								<span className="calma-dot" aria-hidden="true" />
								Ingresar
							</Link>
							<Link href="/register" className="calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]">
								Crear una cuenta
							</Link>
						</div>
					</div>
				) : estado === "cargando" ? (
					<div aria-busy="true" aria-label="Cargando favoritos" className="grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }, (_, i) => (
							<div key={i} className="calma-brillo aspect-[4/3]" />
						))}
					</div>
				) : estado === "error" ? (
					<p role="alert" className="font-display m-0 border-y border-[#efe9df]/15 py-14 text-[clamp(26px,3vw,36px)]">
						No pudimos cargar tus favoritos. Probá de nuevo en un momento.
					</p>
				) : visibles.length === 0 ? (
					<div className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
						<p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">Todavía no guardaste propiedades.</p>
						<p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/70">Tocá el corazón de una propiedad para tenerla siempre a mano acá.</p>
						<Link href="/propiedades" className={enlaceBoton}>
							<span className="calma-dot" aria-hidden="true" />
							Ver propiedades
						</Link>
					</div>
				) : (
					<ul className="m-0 grid list-none gap-x-6 gap-y-14 p-0 md:grid-cols-2 lg:grid-cols-3">
						{visibles.map((propiedad) => (
							<li key={propiedad._id}>
								<TarjetaPropiedad propiedad={propiedad} blue={blue} tamano="compacta" revelar={false} />
							</li>
						))}
					</ul>
				)}
			</section>
		</SitioBase>
	);
}
