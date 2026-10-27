"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SitioBase from "@/components/sitio/SitioBase";
import { useAuth } from "@/context/AuthContext";
import { getPropertyById, type ApiProperty } from "@/services/api";
import { crearSolicitud, type TipoOperacionSolicitud } from "@/services/solicitudes";

type Persona = {
	nombre: string;
	apellido: string;
	dni: string;
	cuil: string;
	fechaNacimiento: string;
	email: string;
	telefono: string;
	domicilio: string;
	localidad: string;
	provincia: string;
	ocupacion: string;
	ingresosMensuales: string;
	referencias: string;
};

type DatosFormulario = {
	titular: Persona;
	incluyeCotitular: boolean;
	cotitular: Persona;
	ingresosTipo: "recibos" | "constancia";
	garantia: {
		tipo: "" | "propietaria" | "caucion";
		localidadPropiedad: string;
		provinciaPropiedad: string;
		garante: Persona;
	};
};

const personaVacia = (): Persona => ({
	nombre: "",
	apellido: "",
	dni: "",
	cuil: "",
	fechaNacimiento: "",
	email: "",
	telefono: "",
	domicilio: "",
	localidad: "",
	provincia: "",
	ocupacion: "",
	ingresosMensuales: "",
	referencias: "",
});

const datosVacios = (): DatosFormulario => ({
	titular: personaVacia(),
	incluyeCotitular: false,
	cotitular: personaVacia(),
	ingresosTipo: "recibos",
	garantia: { tipo: "", localidadPropiedad: "", provinciaPropiedad: "Entre Ríos", garante: personaVacia() },
});

const estilosControl =
	"w-full rounded-xl border border-[#efe9df]/25 bg-[#0b2048] px-4 py-3 text-[15px] text-[#efe9df] placeholder:text-[#efe9df]/35 focus-visible:border-[#efe9df] focus-visible:outline-none [color-scheme:dark]";
const estilosEtiqueta = "calma-micro text-[11px] text-[#efe9df]/70";
const TIPOS_ARCHIVO = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAXIMO_ARCHIVO = 20 * 1024 * 1024;

const OPERACIONES: Record<TipoOperacionSolicitud, string> = { alquiler: "alquiler", compra: "compra" };

function precioLegible(propiedad: ApiProperty) {
	const moneda = propiedad.moneda === "ARS" ? "ARS" : "USD";
	const importe = propiedad.moneda === "ARS" ? propiedad.priceARS ?? propiedad.price : propiedad.price;
	return `${moneda} ${Number(importe || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function camposPersona(prefijo: "titular" | "cotitular" | "garante", datos: Persona, cambiar: (clave: keyof Persona, valor: string) => void, id: string) {
	const definir = (clave: keyof Persona, texto: string, tipo: InputHTMLAttributes<HTMLInputElement>["type"] = "text", props: InputHTMLAttributes<HTMLInputElement> = {}) => (
		<label key={clave} className="flex flex-col gap-2">
			<span className={estilosEtiqueta}>{texto}</span>
			<input
				id={`${id}-${prefijo}-${clave}`}
				type={tipo}
				value={datos[clave]}
				onChange={(evento) => cambiar(clave, evento.target.value)}
				className={estilosControl}
				{...props}
			/>
		</label>
	);

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{definir("nombre", "Nombre *", "text", { autoComplete: "given-name" })}
			{definir("apellido", "Apellido *", "text", { autoComplete: "family-name" })}
			{definir("dni", "DNI *", "text", { inputMode: "numeric", maxLength: 12 })}
			{definir("cuil", "CUIL/CUIT *", "text", { inputMode: "numeric", maxLength: 15 })}
			{definir("fechaNacimiento", "Fecha de nacimiento *", "date")}
			{definir("email", "Correo electrónico *", "email", { autoComplete: "email" })}
			{definir("telefono", "Teléfono *", "tel", { autoComplete: "tel" })}
			{definir("domicilio", "Domicilio actual *", "text", { autoComplete: "street-address" })}
			{definir("localidad", "Localidad *", "text", { autoComplete: "address-level2" })}
			{definir("provincia", "Provincia *", "text", { autoComplete: "address-level1" })}
			{definir("ocupacion", "Ocupación o actividad laboral *")}
			{definir("ingresosMensuales", "Ingresos mensuales *", "number", { min: 1, step: "0.01", inputMode: "decimal" })}
			<label className="flex flex-col gap-2 sm:col-span-2">
				<span className={estilosEtiqueta}>Referencias personales o laborales</span>
				<textarea
					id={`${id}-${prefijo}-referencias`}
					value={datos.referencias}
					onChange={(evento) => cambiar("referencias", evento.target.value)}
					rows={3}
					maxLength={1000}
					className={`${estilosControl} resize-y`}
				/>
			</label>
		</div>
	);
}

function SolicitudForm() {
	const searchParams = useSearchParams();
	const { user, isLoading: authLoading } = useAuth();
	const propiedadId = searchParams.get("propiedad") || "";
	const operacionQuery = searchParams.get("operacion");
	const operacion = operacionQuery === "alquiler" || operacionQuery === "compra" ? operacionQuery : null;
	const [propiedadCargada, setPropiedadCargada] = useState<{ id: string; propiedad: ApiProperty } | null>(null);
	const [errorCarga, setErrorCarga] = useState<{ id: string; mensaje: string } | null>(null);
	const propiedad = propiedadCargada?.id === propiedadId ? propiedadCargada.propiedad : null;
	const errorPropiedad = errorCarga?.id === propiedadId ? errorCarga.mensaje : "";
	const cargandoPropiedad = Boolean(propiedadId && !propiedad && !errorPropiedad);
	const [datos, setDatos] = useState<DatosFormulario>(datosVacios);
	const [documentos, setDocumentos] = useState<Record<string, File[]>>({});
	const [error, setError] = useState("");
	const [enviando, setEnviando] = useState(false);
	const [progreso, setProgreso] = useState("");
	const [enviada, setEnviada] = useState(false);
	const claveIdempotencia = useRef("");
	const completadoPerfil = useRef(false);

	useEffect(() => {
		if (!propiedadId) return;
		let vigente = true;
		getPropertyById(propiedadId)
			.then((resultado) => {
				if (vigente) setPropiedadCargada({ id: propiedadId, propiedad: resultado });
			})
			.catch((fallo: unknown) => {
				if (vigente) setErrorCarga({ id: propiedadId, mensaje: fallo instanceof Error ? fallo.message : "No pudimos recuperar la propiedad." });
			});
		return () => {
			vigente = false;
		};
	}, [propiedadId]);

	useEffect(() => {
		if (!user || completadoPerfil.current) return;
		completadoPerfil.current = true;
		setDatos((actuales) => ({
			...actuales,
			titular: {
				...actuales.titular,
				nombre: actuales.titular.nombre || user.nombre || "",
				apellido: actuales.titular.apellido || user.apellido || "",
				email: actuales.titular.email || user.email || "",
				telefono: actuales.titular.telefono || user.telefono || "",
			},
		}));
	}, [user]);

	const datosOperacion = useMemo(() => {
		if (!propiedad || !operacion) return false;
		const actual = operacion === "compra" ? "venta" : "alquiler";
		const permitidas = propiedad.operacionesSolicitud?.length
			? propiedad.operacionesSolicitud
			: propiedad.categoria_operacion === "venta" || propiedad.categoria_operacion === "alquiler"
				? [propiedad.categoria_operacion]
				: [];
		return propiedad.estado === "disponible" && propiedad.permitirSolicitudes !== false && propiedad.categoria_operacion !== "temporario" && permitidas.includes(actual);
	}, [operacion, propiedad]);

	const archivosAdjuntos = useMemo(() => {
		const permitidos = new Set([
			"dniTitularFrente",
			"dniTitularDorso",
			"cuilTitular",
			"domicilio",
			datos.ingresosTipo === "recibos" ? "recibosIngresos" : "constanciaIngresos",
			...(datos.incluyeCotitular ? ["dniCotitularFrente", "dniCotitularDorso"] : []),
			...(operacion === "alquiler" && datos.garantia.tipo === "propietaria" ? ["escrituraGarantia", "reciboGarante"] : []),
			...(operacion === "alquiler" && datos.garantia.tipo === "caucion" ? ["documentacionCaucion"] : []),
		]);
		return Object.entries(documentos).filter(([tipo]) => permitidos.has(tipo));
	}, [datos, documentos, operacion]);

	const cambiarPersona = (persona: "titular" | "cotitular" | "garante", clave: keyof Persona, valor: string) => {
		setDatos((actuales) => persona === "garante"
			? { ...actuales, garantia: { ...actuales.garantia, garante: { ...actuales.garantia.garante, [clave]: valor } } }
			: { ...actuales, [persona]: { ...actuales[persona], [clave]: valor } });
	};

	const seleccionarArchivos = (clave: string, evento: ChangeEvent<HTMLInputElement>, multiple = false) => {
		const seleccionados = Array.from(evento.target.files || []);
		evento.target.value = "";
		if (seleccionados.some((archivo) => !TIPOS_ARCHIVO.includes(archivo.type) || archivo.size > (archivo.type === "application/pdf" ? 4 * 1024 * 1024 : MAXIMO_ARCHIVO))) {
			setError("Elegí un PDF de hasta 4 MB o una foto JPG/PNG de hasta 20 MB.");
			return;
		}
		setError("");
		setDocumentos((anteriores) => ({ ...anteriores, [clave]: multiple ? seleccionados.slice(0, 3) : seleccionados.slice(0, 1) }));
	};

	const quitarArchivo = (clave: string, indice: number) => {
		setDocumentos((anteriores) => ({ ...anteriores, [clave]: (anteriores[clave] || []).filter((_, i) => i !== indice) }));
	};

	const archivo = (clave: string, titulo: string, descripcion: string, multiple = false, requerido = true) => {
		const seleccionados = documentos[clave] || [];
		return (
			<div key={clave} className="flex flex-col gap-3 rounded-2xl border border-[#efe9df]/15 bg-[#0b2048]/55 p-4">
				<div>
					<p className="m-0 text-[14px] font-medium">{titulo}{requerido ? " *" : ""}</p>
					<p className="m-0 pt-1 text-[12px] text-[#efe9df]/55">{descripcion}</p>
				</div>
				<input
					type="file"
					accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
					multiple={multiple}
					onChange={(evento) => seleccionarArchivos(clave, evento, multiple)}
					aria-label={`Adjuntar ${titulo}`}
					className="w-full text-[12px] text-[#efe9df]/75 file:mr-3 file:rounded-full file:border-0 file:bg-[#efe9df] file:px-4 file:py-2 file:text-[11px] file:font-medium file:text-[#071733] hover:file:bg-white"
				/>
				{seleccionados.length > 0 && (
					<ul className="m-0 flex list-none flex-col gap-2 p-0">
						{seleccionados.map((f, indice) => (
							<li key={`${f.name}-${f.lastModified}-${indice}`} className="flex items-center justify-between gap-3 text-[12px]">
								<span className="min-w-0 truncate">{f.name} · {(f.size / 1024).toFixed(0)} KB</span>
								<button type="button" onClick={() => quitarArchivo(clave, indice)} className="shrink-0 text-[#ffb4ad] underline underline-offset-2">
									Quitar
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	};

	const validar = () => {
		const errores: string[] = [];
		const revisarPersona = (persona: Persona, nombre: string) => {
			const requerido: (keyof Persona)[] = ["nombre", "apellido", "fechaNacimiento", "email", "telefono", "domicilio", "localidad", "provincia", "ocupacion", "ingresosMensuales"];
			requerido.forEach((campo) => {
				if (!persona[campo].trim()) errores.push(`${nombre}: completá ${campo === "ingresosMensuales" ? "los ingresos mensuales" : campo === "fechaNacimiento" ? "la fecha de nacimiento" : campo}.`);
			});
			if (!/^\d{7,8}$/.test(persona.dni.replace(/\D/g, ""))) errores.push(`${nombre}: revisá el DNI (de 7 a 8 números).`);
			if (!/^\d{11}$/.test(persona.cuil.replace(/\D/g, ""))) errores.push(`${nombre}: el CUIL/CUIT debe tener 11 números.`);
			if (persona.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(persona.email.trim())) errores.push(`${nombre}: ingresá un correo válido.`);
			const telefono = persona.telefono.replace(/\D/g, "").length;
			if (persona.telefono && (telefono < 8 || telefono > 15)) errores.push(`${nombre}: revisá el teléfono.`);
			const nacimiento = new Date(persona.fechaNacimiento);
			if (persona.fechaNacimiento && (!Number.isFinite(nacimiento.getTime()) || nacimiento >= new Date())) errores.push(`${nombre}: la fecha de nacimiento debe ser anterior a hoy.`);
			if (!Number.isFinite(Number(persona.ingresosMensuales)) || Number(persona.ingresosMensuales) <= 0) errores.push(`${nombre}: los ingresos mensuales deben ser mayores a cero.`);
		};
		const requiere = (clave: string, titulo: string) => {
			if (!documentos[clave]?.length) errores.push(`Adjuntá ${titulo}.`);
		};

		revisarPersona(datos.titular, "Titular");
		if (!documentos.dniTitularFrente?.length) requiere("dniTitularFrente", "el frente del DNI del titular");
		if (!documentos.dniTitularDorso?.length) requiere("dniTitularDorso", "el dorso del DNI del titular");
		if (!documentos.cuilTitular?.length) requiere("cuilTitular", "la constancia de CUIL/CUIT del titular");
		if (!documentos.domicilio?.length) requiere("domicilio", "el comprobante de domicilio actual");
		if (datos.ingresosTipo === "recibos" && documentos.recibosIngresos?.length !== 3) errores.push("Adjuntá los recibos de sueldo de los últimos tres meses.");
		if (datos.ingresosTipo === "constancia" && !documentos.constanciaIngresos?.length) requiere("constanciaIngresos", "la constancia de ingresos");
		if (datos.incluyeCotitular) {
			revisarPersona(datos.cotitular, "Cotitular");
			if (!documentos.dniCotitularFrente?.length) requiere("dniCotitularFrente", "el frente del DNI del cotitular");
			if (!documentos.dniCotitularDorso?.length) requiere("dniCotitularDorso", "el dorso del DNI del cotitular");
		}
		if (operacion === "alquiler") {
			if (!datos.garantia.tipo) errores.push("Elegí una garantía para el alquiler.");
			if (datos.garantia.tipo === "propietaria") {
				revisarPersona(datos.garantia.garante, "Garante");
				if (!datos.garantia.localidadPropiedad.trim()) errores.push("Indicá la localidad de la propiedad ofrecida como garantía.");
				if (!documentos.escrituraGarantia?.length) requiere("escrituraGarantia", "la escritura de la propiedad en Entre Ríos");
				if (!documentos.reciboGarante?.length) requiere("reciboGarante", "un recibo de sueldo del garante");
			}
		}
		return errores;
	};

	const enviar = async (evento: FormEvent) => {
		evento.preventDefault();
		if (!propiedadId || !operacion || !propiedad || !datosOperacion) {
			setError("La propiedad o la operación seleccionada ya no está disponible para solicitudes.");
			return;
		}
		const errores = validar();
		if (errores.length) {
			setError(errores.slice(0, 5).join(" "));
			return;
		}
		if (!window.crypto?.randomUUID) {
			setError("Tu navegador no permite confirmar el envío de forma segura. Actualizalo y volvé a intentarlo.");
			return;
		}
		if (!claveIdempotencia.current) claveIdempotencia.current = window.crypto.randomUUID();

		const payload = {
			propiedadId,
			operacion,
			titular: datos.titular,
			incluyeCotitular: datos.incluyeCotitular,
			...(datos.incluyeCotitular ? { cotitular: datos.cotitular } : {}),
			ingresosTipo: datos.ingresosTipo,
			...(operacion === "alquiler" ? { garantia: datos.garantia } : {}),
		};
		const formData = new FormData();
		formData.append("datos", JSON.stringify(payload));
		archivosAdjuntos.forEach(([tipo, archivos]) => {
			archivos.forEach((f) => formData.append(tipo, f, f.name));
		});

		setError("");
		setEnviando(true);
		try {
			await crearSolicitud(formData, claveIdempotencia.current, setProgreso);
			setEnviada(true);
		} catch (fallo) {
			setError(fallo instanceof Error ? fallo.message : "No pudimos enviar la solicitud. Probá de nuevo.");
		} finally {
			setEnviando(false);
		}
	};

	const resumenPropiedad = propiedad && (
		<section aria-labelledby="resumen-propiedad" className="grid overflow-hidden rounded-3xl border border-[#efe9df]/15 bg-[#0b2048]/60 sm:grid-cols-[220px_1fr]">
			<div className="relative aspect-[16/10] bg-[#0b2048] sm:aspect-auto">
				{propiedad.images?.[0] ? (
					<Image src={propiedad.images[0]} alt={`Imagen de ${propiedad.title}`} fill unoptimized sizes="220px" className="object-cover" />
				) : <div aria-hidden="true" className="h-full min-h-36 bg-gradient-to-br from-[#132a54] to-[#071733]" />}
			</div>
			<div className="flex flex-col justify-center gap-2 p-5 sm:p-6">
				<p className={estilosEtiqueta}>PROPIEDAD SELECCIONADA</p>
				<h2 id="resumen-propiedad" className="font-display m-0 text-[28px] leading-tight">{propiedad.title}</h2>
				<p className="m-0 text-[14px] text-[#efe9df]/65">{propiedad.ciudad || propiedad.location}</p>
				<p className="m-0 text-[15px] font-medium">{precioLegible(propiedad)}</p>
				{operacion && <span className="calma-micro mt-1 self-start rounded-full bg-[#efe9df] px-3 py-1 text-[10px] text-[#071733]">Solicitud de {OPERACIONES[operacion]}</span>}
			</div>
		</section>
	);

	if (propiedadId && (cargandoPropiedad || authLoading)) {
		return <SitioBase><main className="mx-auto min-h-[70vh] max-w-4xl px-5 pb-24 pt-32 sm:px-10"><p className="text-[#efe9df]/70">Cargando la solicitud…</p></main></SitioBase>;
	}

	if (errorPropiedad || !propiedad || !operacion) {
		return (
			<SitioBase>
				<main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-5 px-5 pb-24 pt-32 sm:px-10">
					<h1 className="font-display m-0 text-5xl">No pudimos iniciar la solicitud.</h1>
					<p className="text-[#efe9df]/70">{!propiedadId ? "No se indicó qué propiedad querés solicitar." : errorPropiedad || "La operación seleccionada no es válida."}</p>
					<Link href={propiedadId ? `/propiedades/${encodeURIComponent(propiedadId)}` : "/propiedades"} className="calma-link self-start">Volver a la propiedad</Link>
				</main>
			</SitioBase>
		);
	}

	const volver = `/solicitudes/nueva?propiedad=${encodeURIComponent(propiedadId)}&operacion=${operacion}`;
	if (!user) {
		return (
			<SitioBase>
				<main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-8 px-5 pb-24 pt-28 sm:px-10">
					<p className={estilosEtiqueta}>SOLICITUD DE {OPERACIONES[operacion].toUpperCase()}</p>
					<h1 className="font-display m-0 text-[clamp(42px,6vw,72px)] leading-none">Iniciá sesión para continuar.</h1>
					{resumenPropiedad}
					<p className="max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">Las solicitudes se envían desde una cuenta de cliente. Al ingresar o crear tu cuenta vas a volver a esta propiedad y operación.</p>
					<div className="flex flex-wrap gap-3">
						<Link href={`/login?volver=${encodeURIComponent(volver)}`} className="calma-micro rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733]">Iniciar sesión</Link>
						<Link href={`/register?volver=${encodeURIComponent(volver)}`} className="calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px]">Crear cuenta</Link>
					</div>
				</main>
			</SitioBase>
		);
	}

	if (user.role !== "cliente") {
		return (
			<SitioBase>
				<main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-6 px-5 pb-24 pt-32 sm:px-10">
					<h1 className="font-display m-0 text-5xl">Esta opción es para clientes.</h1>
					<p className="text-[#efe9df]/70">Ingresá con una cuenta de cliente para enviar una solicitud.</p>
					<Link href={`/propiedades/${encodeURIComponent(propiedadId)}`} className="calma-link self-start">Volver a la propiedad</Link>
				</main>
			</SitioBase>
		);
	}

	if (!datosOperacion) {
		return (
			<SitioBase>
				<main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-6 px-5 pb-24 pt-32 sm:px-10">
					<h1 className="font-display m-0 text-5xl">Esta propiedad no admite esa solicitud.</h1>
					<p className="text-[#efe9df]/70">Puede que ya no esté disponible o que no reciba solicitudes para esta operación.</p>
					<Link href={`/propiedades/${encodeURIComponent(propiedadId)}`} className="calma-link self-start">Volver a la propiedad</Link>
				</main>
			</SitioBase>
		);
	}

	if (enviada) {
		return (
			<SitioBase>
				<main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center gap-6 px-5 pb-24 pt-28 sm:px-10">
					<p className={estilosEtiqueta}>SOLICITUD REGISTRADA</p>
					<h1 className="font-display m-0 text-[clamp(42px,6vw,72px)] leading-none">¡Solicitud enviada correctamente!</h1>
					<p className="max-w-2xl text-[16px] leading-relaxed text-[#efe9df]/75">Recibimos tu documentación. La inmobiliaria revisará la información y podrás consultar el estado de tu solicitud.</p>
					<div className="flex flex-wrap items-center gap-6">
						<Link href="/solicitudes" className="calma-micro self-start rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733]">Ver tus solicitudes</Link>
						<Link href={`/propiedades/${encodeURIComponent(propiedadId)}`} className="calma-micro calma-link">Volver a la propiedad</Link>
					</div>
				</main>
			</SitioBase>
		);
	}

	return (
		<SitioBase>
			<main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pb-24 pt-28 text-[#efe9df] sm:px-10">
				<header className="flex flex-col gap-3">
					<Link href={`/propiedades/${encodeURIComponent(propiedadId)}`} className="calma-micro calma-link self-start">← Volver al detalle</Link>
					<p className={`${estilosEtiqueta} mt-5`}>SOLICITUD DE {OPERACIONES[operacion].toUpperCase()}</p>
					<h1 className="font-display m-0 text-[clamp(42px,6vw,72px)] leading-none">Completá tu solicitud.</h1>
					<p className="m-0 max-w-2xl text-[15px] leading-relaxed text-[#efe9df]/65">Revisá tus datos y adjuntá la documentación. Los archivos se guardan de forma privada y solo puede acceder la inmobiliaria autorizada y el titular.</p>
				</header>
				{resumenPropiedad}

				<form noValidate onSubmit={enviar} className="flex flex-col gap-6">
					<section aria-labelledby="datos-titular" className="flex flex-col gap-5 rounded-3xl border border-[#efe9df]/15 bg-[#071733]/65 p-5 sm:p-8">
						<div>
							<p className={estilosEtiqueta}>01 · SOLICITANTE</p>
							<h2 id="datos-titular" className="font-display m-0 text-3xl">Datos personales</h2>
							<p className="m-0 pt-2 text-[13px] text-[#efe9df]/55">Completá la información de la persona titular de la solicitud.</p>
						</div>
						{camposPersona("titular", datos.titular, (clave, valor) => cambiarPersona("titular", clave, valor), "solicitud")}
						<label className="flex items-center gap-3 border-t border-[#efe9df]/15 pt-5 text-[14px]">
							<input
								type="checkbox"
								checked={datos.incluyeCotitular}
								onChange={(evento) => setDatos((actuales) => ({ ...actuales, incluyeCotitular: evento.target.checked }))}
								className="h-4 w-4 accent-[#d9382b]"
							/>
							La solicitud incluye un cotitular
						</label>
						{datos.incluyeCotitular && (
							<div className="flex flex-col gap-4 rounded-2xl border border-[#efe9df]/10 bg-[#0b2048]/35 p-4 sm:p-5">
								<h3 className="m-0 text-[16px] font-medium">Datos del cotitular</h3>
								{camposPersona("cotitular", datos.cotitular, (clave, valor) => cambiarPersona("cotitular", clave, valor), "solicitud")}
							</div>
						)}
					</section>

					<section aria-labelledby="documentacion" className="flex flex-col gap-5 rounded-3xl border border-[#efe9df]/15 bg-[#071733]/65 p-5 sm:p-8">
						<div>
							<p className={estilosEtiqueta}>02 · ARCHIVOS</p>
							<h2 id="documentacion" className="font-display m-0 text-3xl">Documentación personal</h2>
							<p className="m-0 pt-2 text-[13px] text-[#efe9df]/55">PDF hasta 4 MB · fotos JPG/PNG hasta 20 MB (se optimizan antes de subir). Podés reemplazar o quitar cada documento antes de enviar.</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							{archivo("dniTitularFrente", "DNI del titular · frente", "Imagen legible de la parte frontal.")}
							{archivo("dniTitularDorso", "DNI del titular · dorso", "Imagen legible de la parte posterior.")}
							{archivo("cuilTitular", "Constancia de CUIL/CUIT", "Constancia emitida por el organismo correspondiente.")}
							{archivo("domicilio", "Comprobante de domicilio actual", "Por ejemplo: factura de servicio o impuesto.")}
						</div>
						<fieldset className="m-0 flex flex-col gap-4 border-0 border-t border-[#efe9df]/15 p-0 pt-5">
							<legend className={`${estilosEtiqueta} mb-4`}>ACREDITACIÓN DE INGRESOS *</legend>
							<div className="grid gap-3 sm:grid-cols-2">
								{([
									["recibos", "Recibos de sueldo", "Últimos tres meses"],
									["constancia", "Constancia de ingresos", "Alternativa a los recibos"],
								] as const).map(([valor, titulo, ayuda]) => (
									<label key={valor} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${datos.ingresosTipo === valor ? "border-[#efe9df]/70 bg-[#efe9df]/5" : "border-[#efe9df]/15"}`}>
										<input type="radio" name="ingresosTipo" checked={datos.ingresosTipo === valor} onChange={() => setDatos((actuales) => ({ ...actuales, ingresosTipo: valor }))} className="mt-1 accent-[#d9382b]" />
										<span><span className="block text-[14px] font-medium">{titulo}</span><span className="block pt-1 text-[12px] text-[#efe9df]/55">{ayuda}</span></span>
									</label>
								))}
							</div>
							{datos.ingresosTipo === "recibos"
								? archivo("recibosIngresos", "Recibos de sueldo", "Seleccioná los tres archivos de los últimos tres meses.", true)
								: archivo("constanciaIngresos", "Constancia de ingresos", "Adjuntá un único archivo con la constancia.", false)}
						</fieldset>
						{datos.incluyeCotitular && (
							<div className="grid gap-3 border-t border-[#efe9df]/15 pt-5 sm:grid-cols-2">
								{archivo("dniCotitularFrente", "DNI del cotitular · frente", "Parte frontal del DNI.")}
								{archivo("dniCotitularDorso", "DNI del cotitular · dorso", "Parte posterior del DNI.")}
							</div>
						)}
					</section>

					{operacion === "alquiler" && (
						<section aria-labelledby="garantia" className="flex flex-col gap-5 rounded-3xl border border-[#efe9df]/15 bg-[#071733]/65 p-5 sm:p-8">
							<div>
								<p className={estilosEtiqueta}>03 · ALQUILER</p>
								<h2 id="garantia" className="font-display m-0 text-3xl">Elegí una garantía</h2>
								<p className="m-0 pt-2 text-[13px] text-[#efe9df]/55">Completá únicamente la documentación de la alternativa seleccionada.</p>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								{([
									["propietaria", "Garantía propietaria", "Escritura de una propiedad ubicada en Entre Ríos."],
									["caucion", "Seguro de caución", "Sujeto a evaluación de la inmobiliaria."],
								] as const).map(([valor, titulo, ayuda]) => (
									<label key={valor} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${datos.garantia.tipo === valor ? "border-[#efe9df]/70 bg-[#efe9df]/5" : "border-[#efe9df]/15"}`}>
										<input
											type="radio"
											name="garantia"
											checked={datos.garantia.tipo === valor}
											onChange={() => setDatos((actuales) => ({ ...actuales, garantia: { ...actuales.garantia, tipo: valor } }))}
											className="mt-1 accent-[#d9382b]"
										/>
										<span><span className="block text-[14px] font-medium">{titulo}</span><span className="block pt-1 text-[12px] text-[#efe9df]/55">{ayuda}</span></span>
									</label>
								))}
							</div>
							{datos.garantia.tipo === "propietaria" && (
								<div className="flex flex-col gap-5 border-t border-[#efe9df]/15 pt-5">
									<div className="rounded-xl border border-[#efe9df]/10 bg-[#0b2048]/45 p-4 text-[13px] leading-relaxed text-[#efe9df]/75">
										El ingreso del garante debe ser equivalente, como mínimo, a dos alquileres.
									</div>
									{archivo("escrituraGarantia", "Escritura de la propiedad", "La propiedad ofrecida como garantía debe estar en Entre Ríos.")}
									<label className="flex flex-col gap-2">
										<span className={estilosEtiqueta}>Localidad de la propiedad ofrecida como garantía *</span>
										<input
											value={datos.garantia.localidadPropiedad}
											onChange={(evento) => setDatos((actuales) => ({ ...actuales, garantia: { ...actuales.garantia, localidadPropiedad: evento.target.value } }))}
											className={estilosControl}
										/>
									</label>
									<p className="m-0 text-[13px] text-[#efe9df]/60">Provincia de la propiedad: Entre Ríos.</p>
									<h3 className="m-0 text-[17px] font-medium">Datos del garante</h3>
									{camposPersona("garante", datos.garantia.garante, (clave, valor) => cambiarPersona("garante", clave, valor), "solicitud")}
									{archivo("reciboGarante", "Recibo de sueldo del garante", "Adjuntá un recibo para acreditar sus ingresos.")}
								</div>
							)}
							{datos.garantia.tipo === "caucion" && (
								<div className="flex flex-col gap-3 border-t border-[#efe9df]/15 pt-5">
									<p className="m-0 text-[13px] leading-relaxed text-[#efe9df]/65">Podés adjuntar la documentación si ya disponés de ella. La aceptación del seguro queda sujeta a evaluación de la inmobiliaria.</p>
									{archivo("documentacionCaucion", "Documentación del seguro de caución", "Opcional: podés agregarla más adelante.", false, false)}
								</div>
							)}
						</section>
					)}

					<section aria-labelledby="confirmar" className="flex flex-col gap-5 rounded-3xl border border-[#efe9df]/15 bg-[#071733]/65 p-5 sm:p-8">
						<div>
							<p className={estilosEtiqueta}>{operacion === "alquiler" ? "04" : "03"} · REVISIÓN</p>
							<h2 id="confirmar" className="font-display m-0 text-3xl">Revisá antes de enviar</h2>
						</div>
						<dl className="m-0 grid gap-4 border-t border-[#efe9df]/15 pt-5 sm:grid-cols-2">
							<div><dt className={estilosEtiqueta}>PROPIEDAD</dt><dd className="m-0 pt-1 text-[14px]">{propiedad.title}</dd></div>
							<div><dt className={estilosEtiqueta}>OPERACIÓN</dt><dd className="m-0 pt-1 text-[14px] capitalize">{operacion}</dd></div>
							<div className="sm:col-span-2">
								<dt className={estilosEtiqueta}>DATOS DEL TITULAR</dt>
								<dd className="m-0 pt-1 text-[13px] leading-relaxed text-[#efe9df]/80">
									{`${datos.titular.nombre} ${datos.titular.apellido} · DNI ${datos.titular.dni || "—"} · CUIL/CUIT ${datos.titular.cuil || "—"} · ${datos.titular.email || "Sin correo"} · ${datos.titular.telefono || "Sin teléfono"}`}
									<br />{`${datos.titular.domicilio || "Sin domicilio"}, ${datos.titular.localidad || "sin localidad"}, ${datos.titular.provincia || "sin provincia"}`}
									<br />{`Actividad: ${datos.titular.ocupacion || "—"} · Ingresos mensuales: ${datos.titular.ingresosMensuales || "—"}`}
									{datos.titular.referencias.trim() && <><br />{`Referencias: ${datos.titular.referencias}`}</>}
								</dd>
							</div>
							{datos.incluyeCotitular && (
								<div className="sm:col-span-2">
									<dt className={estilosEtiqueta}>DATOS DEL COTITULAR</dt>
									<dd className="m-0 pt-1 text-[13px] leading-relaxed text-[#efe9df]/80">
										{`${datos.cotitular.nombre} ${datos.cotitular.apellido} · DNI ${datos.cotitular.dni || "—"} · CUIL/CUIT ${datos.cotitular.cuil || "—"} · ${datos.cotitular.email || "Sin correo"} · ${datos.cotitular.telefono || "Sin teléfono"}`}
									</dd>
								</div>
							)}
							<div className="sm:col-span-2">
								<dt className={estilosEtiqueta}>DOCUMENTOS ADJUNTOS ({archivosAdjuntos.reduce((total, [, items]) => total + items.length, 0)})</dt>
								<dd className="m-0 pt-1">
									<ul className="flex list-none flex-col gap-1 p-0 text-[13px] text-[#efe9df]/80">
										{archivosAdjuntos.flatMap(([tipo, items]) => items.map((item, indice) => (
											<li key={`${tipo}-${indice}`}>{item.name}</li>
										)))}
										{archivosAdjuntos.length === 0 && <li>Aún no se adjuntaron archivos.</li>}
									</ul>
								</dd>
							</div>
							{operacion === "alquiler" && datos.garantia.tipo && (
								<div className="sm:col-span-2">
									<dt className={estilosEtiqueta}>GARANTÍA</dt>
									<dd className="m-0 pt-1 text-[13px] leading-relaxed text-[#efe9df]/80">
										{datos.garantia.tipo === "propietaria"
											? `Propietaria · ${datos.garantia.garante.nombre} ${datos.garantia.garante.apellido} · DNI ${datos.garantia.garante.dni || "—"} · Localidad de la propiedad: ${datos.garantia.localidadPropiedad || "—"}`
											: "Seguro de caución"}
									</dd>
								</div>
							)}
						</dl>
						<p className="m-0 text-[12px] leading-relaxed text-[#efe9df]/50">Al enviar, confirmás que los datos y documentos son correctos. La propiedad no cambia de estado por recibir esta solicitud.</p>
						{error && <p role="alert" className="m-0 rounded-xl border border-[#d9382b]/35 bg-[#d9382b]/10 p-4 text-[13px] leading-relaxed text-[#ffb4ad]">{error}</p>}
						<button type="submit" disabled={enviando} className="calma-micro flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] font-medium text-[#071733] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60">
							{enviando ? progreso || "Enviando solicitud…" : "Confirmar y enviar solicitud"}
						</button>
					</section>
				</form>
			</main>
		</SitioBase>
	);
}

export default function SolicitudNuevaPage() {
	return <Suspense fallback={<SitioBase><main className="min-h-[70vh] px-5 pt-32 text-[#efe9df]/70">Cargando…</main></SitioBase>}><SolicitudForm /></Suspense>;
}
