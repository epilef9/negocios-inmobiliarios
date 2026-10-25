"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { EnlaceDeDesarrollo } from "@/components/cuenta/PantallaCuenta";
import { useAuth } from "@/context/AuthContext";
import { ErrorPerfil, getPerfil, guardarPerfil, pedirCambioPassword, type DatosPerfil } from "@/services/perfil";
import { getMisSolicitudesPublicacion, type SolicitudPublicacion } from "@/services/solicitudesPublicacion";

// Estilos del formulario, iguales a los de ingreso y registro
const etiqueta = "calma-micro text-[#efe9df]/70";
const control =
	"w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]";
const botonPrincipal =
	"calma-micro inline-flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60";
const enlaceCuenta = "calma-link calma-link-sutil text-[15px] text-[#efe9df]/80 hover:text-[#efe9df]";

const VACIO: DatosPerfil = { nombre: "", apellido: "", email: "", telefono: "" };
const DESDE = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

type Aviso = { tono: "bien" | "mal"; texto: string } | null;

function Mensaje({ aviso }: { aviso: Aviso }) {
	if (!aviso) return null;
	return (
		<p role={aviso.tono === "mal" ? "alert" : "status"} className={`m-0 text-[15px] ${aviso.tono === "mal" ? "text-[#ff8b80]" : "text-[#9fd8b4]"}`}>
			{aviso.texto}
		</p>
	);
}

function Campo({ id, texto, error, ayuda, children }: { id: string; texto: string; error?: string; ayuda?: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={id} className={etiqueta}>
				{texto}
			</label>
			{children}
			{error ? (
				<span id={`${id}-error`} className="text-[13.5px] text-[#ff8b80]">
					{error}
				</span>
			) : ayuda ? (
				<span className="text-[13.5px] text-[#efe9df]/50">{ayuda}</span>
			) : null}
		</div>
	);
}

// Mi cuenta: datos de contacto (email obligatorio) y contraseña. Sirve para clientes y para la administración.
export default function PerfilPage() {
	const id = useId();
	const { user, isLoading, logout, actualizarUsuario } = useAuth();
	const [datos, setDatos] = useState<DatosPerfil>(VACIO);
	const [emailGuardado, setEmailGuardado] = useState("");
	const [miembroDesde, setMiembroDesde] = useState<string | null>(null);
	const [cargando, setCargando] = useState(true);
	const [errorCarga, setErrorCarga] = useState<string | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [guardando, setGuardando] = useState(false);
	const [aviso, setAviso] = useState<Aviso>(null);

	const [emailPendiente, setEmailPendiente] = useState<string | null>(null);
	const [enlaceDev, setEnlaceDev] = useState<string | null>(null);

	const [pidiendoClave, setPidiendoClave] = useState(false);
	const [avisoClave, setAvisoClave] = useState<Aviso>(null);
	const [enlaceDevClave, setEnlaceDevClave] = useState<string | null>(null);

	const [solicitudes, setSolicitudes] = useState<SolicitudPublicacion[]>([]);
	const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);

	useEffect(() => {
		if (isLoading || !user) return;
		let activo = true;
		getPerfil()
			.then((perfil) => {
				if (!activo) return;
				setDatos({ nombre: perfil.nombre ?? "", apellido: perfil.apellido ?? "", email: perfil.email ?? "", telefono: perfil.telefono ?? "" });
				setEmailGuardado(perfil.email ?? "");
				setEmailPendiente(perfil.emailPendiente ?? null);
				setMiembroDesde(perfil.createdAt ? DESDE.format(new Date(perfil.createdAt)) : null);
			})
			.catch((e: Error) => activo && setErrorCarga(e.message))
			.finally(() => activo && setCargando(false));

		getMisSolicitudesPublicacion()
			.then((res) => {
				if (activo) setSolicitudes(res);
			})
			.catch(() => {})
			.finally(() => activo && setCargandoSolicitudes(false));

		return () => {
			activo = false;
		};
	}, [user, isLoading]);

	const cambiaEmail = datos.email.trim().toLowerCase() !== emailGuardado.toLowerCase();

	const cambiar = (campo: keyof DatosPerfil, valor: string) => {
		setDatos((d) => ({ ...d, [campo]: valor }));
		setErrores((e) => Object.fromEntries(Object.entries(e).filter(([clave]) => clave !== campo)));
		setAviso(null);
	};

	// Las mismas reglas que el servidor, para avisar antes de enviar
	const revisar = () => {
		const e: Record<string, string> = {};
		if (!datos.nombre.trim()) e.nombre = "Escribí tu nombre.";
		if (!datos.apellido.trim()) e.apellido = "Escribí tu apellido.";
		if (!datos.email.trim()) e.email = "El email es obligatorio.";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) e.email = "Ese email no parece válido.";
		const digitos = datos.telefono.replace(/\D/g, "");
		if (!datos.telefono.trim()) e.telefono = "El teléfono es obligatorio.";
		else if (digitos.length < 8 || digitos.length > 15) e.telefono = "Revisá el teléfono: con característica, entre 8 y 15 números.";
		if (cambiaEmail && !datos.passwordActual) e.passwordActual = "Para cambiar el email, confirmá con tu contraseña.";
		return e;
	};

	const guardar = async (evento: FormEvent) => {
		evento.preventDefault();
		const pendientes = revisar();
		setErrores(pendientes);
		if (Object.keys(pendientes).length) {
			setAviso({ tono: "mal", texto: "Revisá los datos marcados." });
			document.getElementById(`${id}-${Object.keys(pendientes)[0]}`)?.focus();
			return;
		}
		setGuardando(true);
		setAviso(null);
		try {
			const resultado = await guardarPerfil({ ...datos, passwordActual: cambiaEmail ? datos.passwordActual : undefined });
			// El email de la cuenta sigue siendo el anterior hasta que se confirme el nuevo desde su casilla
			actualizarUsuario({ ...user!, ...resultado.user });
			setEmailGuardado(resultado.user.email);
			setDatos((d) => ({ ...d, email: resultado.user.email, passwordActual: undefined }));
			if (resultado.emailPendiente) setEmailPendiente(resultado.emailPendiente);
			setEnlaceDev(resultado.enlaceDev ?? null);
			setAviso({ tono: "bien", texto: resultado.mensaje || "Listo, tus datos quedaron guardados." });
		} catch (e) {
			if (e instanceof ErrorPerfil) setErrores(e.errores);
			setAviso({ tono: "mal", texto: e instanceof Error ? e.message : "No se pudieron guardar los datos." });
		} finally {
			setGuardando(false);
		}
	};

	// La contraseña no se cambia acá: se manda un enlace al email de la cuenta (así nadie que encuentre
	// la sesión abierta puede cambiarla)
	const pedirClave = async () => {
		setPidiendoClave(true);
		setAvisoClave(null);
		try {
			const respuesta = await pedirCambioPassword();
			setEnlaceDevClave(respuesta.enlaceDev ?? null);
			setAvisoClave({ tono: "bien", texto: respuesta.mensaje || `Te mandamos un mail a ${emailGuardado} con el enlace.` });
		} catch (error) {
			setAvisoClave({ tono: "mal", texto: error instanceof Error ? error.message : "No pudimos mandar el mail." });
		} finally {
			setPidiendoClave(false);
		}
	};

	const enlaceBoton = "calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white";

	return (
		<SitioBase pieSimple>
			<header className="encabezado-color encabezado-azul px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
				<h1 className="font-display m-0 text-[clamp(56px,8vw,128px)] font-normal leading-[0.9] tracking-[-0.02em]">Mi cuenta</h1>
				{user && (
					<p className="m-0 mt-4 text-[15px] text-[#efe9df]/70">
						{user.role === "admin" ? "Cuenta de administración" : "Cuenta de cliente"}
						{miembroDesde ? ` · desde ${miembroDesde}` : ""}
					</p>
				)}
			</header>

			{!isLoading && !user ? (
				<section className="px-5 pb-24 sm:px-10">
					<div className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
						<p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">Ingresá para ver y editar tus datos.</p>
						<Link href="/login?volver=/perfil" className={enlaceBoton}>
							<span className="calma-dot" aria-hidden="true" />
							Ingresar
						</Link>
					</div>
				</section>
			) : (
				<div className="grid gap-16 px-5 pb-24 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-24">
					<div className="flex flex-col gap-16">
						<section aria-labelledby={`${id}-datos-titulo`} className="border-t border-[#efe9df]/15 pt-10">
							<h2 id={`${id}-datos-titulo`} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
								Tus datos
							</h2>
							<p className="m-0 mt-3 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">Los usamos para responder tus consultas y coordinar visitas. El email y el teléfono son obligatorios.</p>

							{errorCarga ? (
								<p role="alert" className="m-0 mt-8 text-[15px] text-[#ff8b80]">
									{errorCarga}
								</p>
							) : (
								<form noValidate onSubmit={guardar} aria-busy={cargando} className={`mt-10 grid gap-8 sm:grid-cols-2 ${cargando ? "opacity-50" : ""}`}>
									<Campo id={`${id}-nombre`} texto="Nombre *" error={errores.nombre}>
										<input id={`${id}-nombre`} type="text" autoComplete="given-name" disabled={cargando} value={datos.nombre} aria-invalid={Boolean(errores.nombre)} onChange={(e) => cambiar("nombre", e.target.value)} className={control} />
									</Campo>
									<Campo id={`${id}-apellido`} texto="Apellido *" error={errores.apellido}>
										<input id={`${id}-apellido`} type="text" autoComplete="family-name" disabled={cargando} value={datos.apellido} aria-invalid={Boolean(errores.apellido)} onChange={(e) => cambiar("apellido", e.target.value)} className={control} />
									</Campo>
									<Campo id={`${id}-email`} texto="Email *" error={errores.email} ayuda="Es con el que ingresás. Si lo cambiás, te mandamos un mail para confirmarlo.">
										<input id={`${id}-email`} type="email" autoComplete="email" required disabled={cargando} value={datos.email} aria-invalid={Boolean(errores.email)} onChange={(e) => cambiar("email", e.target.value)} className={control} />
									</Campo>
									<Campo id={`${id}-telefono`} texto="Teléfono *" error={errores.telefono} ayuda="Con característica, ej.: 343 444 4444.">
										<input id={`${id}-telefono`} type="tel" autoComplete="tel" required disabled={cargando} value={datos.telefono} aria-invalid={Boolean(errores.telefono)} onChange={(e) => cambiar("telefono", e.target.value)} placeholder="343 444 4444" className={control} />
									</Campo>
									{cambiaEmail && (
										<div className="sm:col-span-2">
											<Campo id={`${id}-passwordActual`} texto="Contraseña actual *" error={errores.passwordActual} ayuda="Como cambia el email con el que ingresás, confirmá que sos vos.">
												<input id={`${id}-passwordActual`} type="password" autoComplete="current-password" value={datos.passwordActual ?? ""} aria-invalid={Boolean(errores.passwordActual)} onChange={(e) => cambiar("passwordActual", e.target.value)} className={control} />
											</Campo>
										</div>
									)}
									<div className="flex flex-wrap items-center gap-6 sm:col-span-2">
										<button type="submit" disabled={guardando || cargando} className={botonPrincipal}>
											{guardando ? "Guardando…" : "Guardar cambios"}
										</button>
										<Mensaje aviso={aviso} />
									</div>
									{emailPendiente && (
										<p className="m-0 text-[14px] leading-relaxed text-[#efe9df]/65 sm:col-span-2">
											Cambio pendiente: para empezar a usar <strong className="font-semibold text-[#efe9df]">{emailPendiente}</strong> tocá el enlace que te mandamos a esa casilla. Hasta entonces seguís ingresando con {emailGuardado}.
										</p>
									)}
									{enlaceDev && (
										<div className="sm:col-span-2">
											<EnlaceDeDesarrollo enlace={enlaceDev} para="confirmar el email nuevo" accion="Confirmar email nuevo" />
										</div>
									)}
								</form>
							)}
						</section>

						<section aria-labelledby={`${id}-clave-titulo`} className="border-t border-[#efe9df]/15 pt-10">
							<h2 id={`${id}-clave-titulo`} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
								Contraseña
							</h2>
							<p className="m-0 mt-3 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
								Por seguridad, te mandamos un enlace a <strong className="font-semibold text-[#efe9df]">{emailGuardado || "tu email"}</strong> para que elijas la nueva. Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
							</p>
							<div className="mt-8 flex flex-wrap items-center gap-6">
								<button type="button" onClick={pedirClave} disabled={pidiendoClave || cargando || Boolean(errorCarga)} className={botonPrincipal}>
									{pidiendoClave ? "Enviando…" : "Mandarme el enlace"}
								</button>
								<Mensaje aviso={avisoClave} />
							</div>
							{enlaceDevClave && <EnlaceDeDesarrollo enlace={enlaceDevClave} para="elegir la contraseña nueva" accion="Elegir contraseña nueva" />}
						</section>

						{/* Sección de publicaciones solicitadas (HU-08) */}
						<section id="mis-publicaciones" aria-labelledby={`${id}-publicaciones-titulo`} className="border-t border-[#efe9df]/15 pt-10">
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div>
									<h2 id={`${id}-publicaciones-titulo`} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
										Mis publicaciones
									</h2>
									<p className="m-0 mt-3 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
										Estado de las propiedades que solicitaste publicar con nosotros.
									</p>
								</div>
								<Link
									href="/publicar"
									className="calma-micro inline-flex items-center gap-2 rounded-full border border-[#efe9df]/40 px-5 py-3 text-[12px] text-[#efe9df] transition-colors hover:border-[#efe9df] hover:bg-[#efe9df]/10"
								>
									+ Publicar propiedad
								</Link>
							</div>

							<div className="mt-8 flex flex-col gap-4">
								{cargandoSolicitudes ? (
									<p className="m-0 text-[15px] text-[#efe9df]/50">Cargando publicaciones…</p>
								) : solicitudes.length === 0 ? (
									<div className="rounded-xl border border-[#efe9df]/15 bg-[#efe9df]/5 p-6 text-center sm:p-10">
										<p className="m-0 text-[16px] text-[#efe9df]/80">Todavía no enviaste ninguna propiedad para publicar.</p>
										<p className="m-0 mt-2 text-[14px] text-[#efe9df]/50">
											Si sos dueño o querés alquilar tu inmueble, podés solicitar la publicación en minutos.
										</p>
										<Link
											href="/publicar"
											className="calma-micro mt-6 inline-flex items-center gap-2 rounded-full bg-[#efe9df] px-6 py-3 text-[12px] text-[#071733] transition-colors hover:bg-white"
										>
											Solicitar publicación
										</Link>
									</div>
								) : (
									<div className="grid gap-4 sm:grid-cols-2">
										{solicitudes.map((sol) => {
											const estadoColor =
												sol.estado === "aprobada"
													? "bg-[#9fd8b4]/20 text-[#9fd8b4] border-[#9fd8b4]/30"
													: sol.estado === "rechazada"
													? "bg-[#d9382b]/20 text-[#ff8b80] border-[#d9382b]/30"
													: "bg-amber-500/20 text-amber-300 border-amber-500/30";

											const estadoTexto =
												sol.estado === "aprobada"
													? "Aprobada"
													: sol.estado === "rechazada"
													? "No aprobada"
													: "En revisión";

											return (
												<div key={sol._id} className="flex flex-col justify-between rounded-xl border border-[#efe9df]/15 bg-[#efe9df]/5 p-5">
													<div>
														<div className="flex items-center justify-between gap-2">
															<span className="calma-micro uppercase text-[11px] tracking-wider text-[#efe9df]/50">
																{sol.tipoPropiedad} en {sol.operacion}
															</span>
															<span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${estadoColor}`}>
																{estadoTexto}
															</span>
														</div>
														<h3 className="m-0 mt-2 text-[17px] font-semibold text-[#efe9df]">
															{sol.direccion}
														</h3>
														<p className="m-0 mt-1 text-[14px] text-[#efe9df]/60">
															{sol.ciudad || "Libertador San Martín"}
														</p>
														<p className="m-0 mt-2 text-[15px] font-medium text-[#efe9df]">
															{sol.precioPretendido?.moneda === "ARS" ? "$" : "USD "}{" "}
															{sol.precioPretendido?.monto?.toLocaleString("es-AR")}
														</p>
														{sol.estado === "rechazada" && sol.motivoRechazo && (
															<div className="mt-3 rounded-lg border border-[#d9382b]/30 bg-[#d9382b]/10 p-3 text-[13px] text-[#ff8b80]">
																<strong className="font-semibold">Motivo:</strong> {sol.motivoRechazo}
															</div>
														)}
													</div>
													<div className="mt-4 flex items-center justify-between border-t border-[#efe9df]/10 pt-3 text-[12px] text-[#efe9df]/40">
														<span>
															Enviado {new Date(sol.createdAt).toLocaleDateString("es-AR")}
														</span>
														{sol.estado === "aprobada" && sol.propiedadCreada && typeof sol.propiedadCreada === "object" && (
															<Link
																href={`/propiedades/${sol.propiedadCreada._id}`}
																className="calma-link text-[#9fd8b4]"
															>
																Ver en catálogo →
															</Link>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</section>
					</div>

					<aside aria-label="Accesos de tu cuenta" className="flex flex-col gap-8 border-t border-[#efe9df]/15 pt-10 lg:self-start">
						<p className="calma-micro m-0 text-[#efe9df]/55">Tu cuenta</p>
						<nav className="flex flex-col items-start gap-4">
							{user?.role === "admin" && (
								<Link href="/admin" className={enlaceCuenta}>
									Ir al panel de administración
								</Link>
							)}
							<Link href="/favoritos" className={enlaceCuenta}>
								Mis favoritos
							</Link>
							<Link href="/publicar" className={enlaceCuenta}>
								Publicar mi propiedad
							</Link>
							<Link href="/requisitos" className={enlaceCuenta}>
								Mis requisitos para alquilar o comprar
							</Link>
							<Link href="/propiedades" className={enlaceCuenta}>
								Ver propiedades
							</Link>
						</nav>
						<button type="button" onClick={logout} className="calma-micro self-start text-[#efe9df]/60 transition-colors hover:text-[#efe9df]">
							Cerrar sesión
						</button>
					</aside>
				</div>
			)}
		</SitioBase>
	);
}
