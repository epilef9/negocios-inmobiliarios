"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { useAuth } from "@/context/AuthContext";
import { ErrorPerfil, cambiarPassword, getPerfil, guardarPerfil, type DatosPerfil } from "@/services/perfil";

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

	const [claves, setClaves] = useState({ actual: "", nueva: "", repetir: "" });
	const [erroresClave, setErroresClave] = useState<Record<string, string>>({});
	const [cambiandoClave, setCambiandoClave] = useState(false);
	const [avisoClave, setAvisoClave] = useState<Aviso>(null);

	useEffect(() => {
		if (isLoading || !user) return;
		let activo = true;
		getPerfil()
			.then((perfil) => {
				if (!activo) return;
				setDatos({ nombre: perfil.nombre ?? "", apellido: perfil.apellido ?? "", email: perfil.email ?? "", telefono: perfil.telefono ?? "" });
				setEmailGuardado(perfil.email ?? "");
				setMiembroDesde(perfil.createdAt ? DESDE.format(new Date(perfil.createdAt)) : null);
			})
			.catch((e: Error) => activo && setErrorCarga(e.message))
			.finally(() => activo && setCargando(false));
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
			const actualizado = await guardarPerfil({ ...datos, passwordActual: cambiaEmail ? datos.passwordActual : undefined });
			actualizarUsuario({ ...user!, ...actualizado });
			setEmailGuardado(actualizado.email);
			setDatos((d) => ({ ...d, email: actualizado.email, passwordActual: undefined }));
			setAviso({ tono: "bien", texto: "Listo, tus datos quedaron guardados." });
		} catch (e) {
			if (e instanceof ErrorPerfil) setErrores(e.errores);
			setAviso({ tono: "mal", texto: e instanceof Error ? e.message : "No se pudieron guardar los datos." });
		} finally {
			setGuardando(false);
		}
	};

	const guardarClave = async (evento: FormEvent) => {
		evento.preventDefault();
		const e: Record<string, string> = {};
		if (!claves.actual) e.actual = "Escribí tu contraseña actual.";
		if (claves.nueva.length < 8) e.nueva = "Mínimo 8 caracteres.";
		if (claves.repetir !== claves.nueva) e.repetir = "No coincide con la nueva contraseña.";
		setErroresClave(e);
		setAvisoClave(null);
		if (Object.keys(e).length) return;
		setCambiandoClave(true);
		try {
			await cambiarPassword(claves.actual, claves.nueva);
			setClaves({ actual: "", nueva: "", repetir: "" });
			setAvisoClave({ tono: "bien", texto: "Contraseña actualizada. La próxima vez ingresá con la nueva." });
		} catch (error) {
			if (error instanceof ErrorPerfil) {
				setErroresClave({ actual: error.errores.passwordActual ?? "", nueva: error.errores.passwordNueva ?? "" });
			}
			setAvisoClave({ tono: "mal", texto: error instanceof Error ? error.message : "No se pudo cambiar la contraseña." });
		} finally {
			setCambiandoClave(false);
		}
	};

	const enlaceBoton = "calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white";

	return (
		<SitioBase pieSimple>
			<header className="px-5 pb-12 pt-32 sm:px-10 lg:pt-40">
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
									<Campo id={`${id}-email`} texto="Email *" error={errores.email} ayuda="Es con el que ingresás a tu cuenta.">
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
								</form>
							)}
						</section>

						<section aria-labelledby={`${id}-clave-titulo`} className="border-t border-[#efe9df]/15 pt-10">
							<h2 id={`${id}-clave-titulo`} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
								Contraseña
							</h2>
							<form noValidate onSubmit={guardarClave} className="mt-10 grid gap-8 sm:grid-cols-2">
								<div className="sm:col-span-2 sm:max-w-[calc(50%-1rem)]">
									<Campo id={`${id}-actual`} texto="Contraseña actual" error={erroresClave.actual || undefined}>
										<input id={`${id}-actual`} type="password" autoComplete="current-password" value={claves.actual} aria-invalid={Boolean(erroresClave.actual)} onChange={(e) => setClaves((c) => ({ ...c, actual: e.target.value }))} className={control} />
									</Campo>
								</div>
								<Campo id={`${id}-nueva`} texto="Nueva contraseña" error={erroresClave.nueva || undefined} ayuda="Mínimo 8 caracteres.">
									<input id={`${id}-nueva`} type="password" autoComplete="new-password" value={claves.nueva} aria-invalid={Boolean(erroresClave.nueva)} onChange={(e) => setClaves((c) => ({ ...c, nueva: e.target.value }))} className={control} />
								</Campo>
								<Campo id={`${id}-repetir`} texto="Repetí la nueva" error={erroresClave.repetir || undefined}>
									<input id={`${id}-repetir`} type="password" autoComplete="new-password" value={claves.repetir} aria-invalid={Boolean(erroresClave.repetir)} onChange={(e) => setClaves((c) => ({ ...c, repetir: e.target.value }))} className={control} />
								</Campo>
								<div className="flex flex-wrap items-center gap-6 sm:col-span-2">
									<button type="submit" disabled={cambiandoClave} className={botonPrincipal}>
										{cambiandoClave ? "Cambiando…" : "Cambiar contraseña"}
									</button>
									<Mensaje aviso={avisoClave} />
								</div>
							</form>
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
