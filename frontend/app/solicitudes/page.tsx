"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { useAuth } from "@/context/AuthContext";
import { getMisSolicitudes, type EstadoSolicitud, type SolicitudResumen } from "@/services/solicitudes";

const ESTADOS: Record<EstadoSolicitud, { texto: string; clase: string }> = {
	pendiente: {
		texto: "Pendiente",
		clase: "bg-[#d9a83b]/15 text-[#f2cf72] ring-1 ring-inset ring-[#d9a83b]/45",
	},
	aprobada: {
		texto: "Aprobada",
		clase: "bg-[#367a55]/20 text-[#9fd8b4] ring-1 ring-inset ring-[#70b78b]/45",
	},
	rechazada: {
		texto: "Rechazada",
		clase: "bg-[#d9382b]/20 text-[#ffaaa1] ring-1 ring-inset ring-[#d9382b]/45",
	},
};

const fechaSolicitud = (fecha: string) => {
	const fechaValida = new Date(fecha);
	return Number.isNaN(fechaValida.getTime())
		? "Fecha no disponible"
		: fechaValida.toLocaleDateString("es-AR", {
				day: "numeric",
				month: "long",
				year: "numeric",
				timeZone: "America/Argentina/Buenos_Aires",
			});
};

function ImagenPropiedad({ imagen, titulo }: { imagen?: string | null; titulo?: string | null }) {
	const [fallo, setFallo] = useState(false);
	return (
		<div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#efe9df]/5">
			{imagen && !fallo ? (
				<Image src={imagen} alt={titulo ? `Foto de ${titulo}` : "Foto de la propiedad solicitada"} fill sizes="(min-width: 768px) 256px, (min-width: 640px) calc(100vw - 136px), calc(100vw - 80px)" className="object-cover" onError={() => setFallo(true)} />
			) : (
				<div className="flex h-full items-center justify-center p-6 text-center text-[14px] text-[#efe9df]/55">Imagen no disponible</div>
			)}
		</div>
	);
}

export default function SolicitudesPage() {
	const { user, isLoading } = useAuth();
	const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [reintentos, setReintentos] = useState(0);

	useEffect(() => {
		if (isLoading) return;
		if (!user || user.role === "admin") return;

		let activo = true;
		getMisSolicitudes()
			.then((lista) => {
				if (activo) setSolicitudes(lista);
			})
			.catch((e: Error) => {
				if (activo) setError(e.message || "No pudimos cargar tus solicitudes.");
			});

		return () => {
			activo = false;
		};
	}, [user, isLoading, reintentos]);

	const cargando = isLoading || (!error && solicitudes === null && Boolean(user) && user?.role !== "admin");

	return (
		<SitioBase pieSimple>
			<header className="encabezado-color encabezado-azul px-5 pb-12 pt-32 sm:px-10 lg:pt-40">
				<Link href="/perfil" className="calma-micro calma-link calma-link-sutil text-[13px] text-[#efe9df]/70">
					← Volver a Mi cuenta
				</Link>
				<h1 className="font-display m-0 mt-8 text-[clamp(56px,8vw,112px)] font-normal leading-[0.9] tracking-[-0.02em]">
					Tus solicitudes
				</h1>
				<p className="m-0 mt-5 max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">
					Consultá el estado de tus solicitudes de alquiler o compra y las novedades de la inmobiliaria.
				</p>
			</header>

			<section aria-label="Solicitudes de alquiler o compra" className="px-5 pb-24 pt-10 sm:px-10">
				{isLoading ? (
					<p role="status" className="m-0 text-[15px] text-[#efe9df]/60">
						Comprobando tu cuenta…
					</p>
				) : !user ? (
					<div className="flex flex-col items-start gap-5">
						<p className="m-0 text-[16px] text-[#efe9df]/75">Ingresá para consultar las solicitudes de tu cuenta.</p>
						<Link href="/login?volver=/solicitudes" className="calma-micro inline-flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-3.5 text-[12px] text-[#071733] transition-colors hover:bg-white">
							Ingresar
						</Link>
					</div>
				) : user.role === "admin" ? (
					<p className="m-0 text-[15px] text-[#efe9df]/70">Esta sección está disponible para cuentas de cliente.</p>
				) : error ? (
					<div role="alert" className="flex flex-col items-start gap-5">
						<p className="m-0 text-[15px] text-[#ff8b80]">{error}</p>
						<button
							type="button"
							onClick={() => {
								setError(null);
								setSolicitudes(null);
								setReintentos((actual) => actual + 1);
							}}
							className="calma-micro inline-flex items-center gap-2.5 rounded-full border border-[#efe9df]/40 px-6 py-3.5 text-[12px] text-[#efe9df] transition-colors hover:border-[#efe9df] hover:bg-[#efe9df]/10"
						>
							Reintentar
						</button>
					</div>
				) : cargando ? (
					<div aria-busy="true" aria-label="Cargando tus solicitudes" className="flex flex-col gap-4">
						<span className="calma-brillo h-32 w-full rounded-xl" />
						<span className="calma-brillo h-32 w-full rounded-xl" />
					</div>
				) : solicitudes?.length === 0 ? (
					<div className="rounded-xl border border-[#efe9df]/15 bg-[#efe9df]/5 px-6 py-10 text-center sm:px-10">
						<p className="m-0 text-[16px] text-[#efe9df]/80">Todavía no realizaste ninguna solicitud de alquiler o compra.</p>
					</div>
				) : (
					<ul className="m-0 flex list-none flex-col gap-4 p-0">
						{solicitudes?.map((solicitud) => {
							const estado = ESTADOS[solicitud.estado];
							const propiedad = solicitud.propiedad;
							const comentario = solicitud.comentarioEstado?.trim();

							return (
								<li key={solicitud.id} className="grid items-start gap-6 rounded-xl border border-[#efe9df]/15 bg-[#efe9df]/[0.04] p-5 sm:p-7 md:grid-cols-[16rem_minmax(0,1fr)]">
									<ImagenPropiedad key={propiedad?.imagen ?? "sin-imagen"} imagen={propiedad?.imagen} titulo={propiedad?.titulo} />
									<div className="min-w-0">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="calma-micro m-0 text-[11px] text-[#efe9df]/50">
												{solicitud.operacion === "alquiler" ? "Solicitud de alquiler" : "Solicitud de compra"}
											</p>
											{propiedad?.titulo && propiedad.id ? (
												<Link href={`/propiedades/${propiedad.id}`} className="calma-link calma-link-sutil mt-2 inline-block text-[21px] text-[#efe9df]">
													{propiedad.titulo}
												</Link>
											) : (
												<h2 className="font-display m-0 mt-2 text-[21px] font-normal text-[#efe9df]/75">
													Propiedad no disponible
												</h2>
											)}
										</div>
										<span className={`calma-micro inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-[11px] ${estado.clase}`}>
											{estado.texto}
										</span>
									</div>

									<p className="m-0 mt-4 text-[14px] text-[#efe9df]/65">
										Fecha de solicitud: <time dateTime={solicitud.createdAt}>{fechaSolicitud(solicitud.createdAt)}</time>
									</p>

									{comentario && (
										<div className="mt-5 border-t border-[#efe9df]/10 pt-4">
											<p className="calma-micro m-0 text-[11px] text-[#efe9df]/50">Comentario del administrador</p>
											<p className="m-0 mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#efe9df]/80">{comentario}</p>
										</div>
									)}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</SitioBase>
	);
}
