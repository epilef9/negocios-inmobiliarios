'use client';

import { useEffect, useState } from 'react';
import { Boton, Campo, Dialogo, Encabezado, EstadoVacio, Insignia, Tarjeta, control, useAviso, useConfirmar } from '@/components/panel/ui';
import { ETIQUETAS_SECCION, SECCIONES_CON_PERMISO } from '@/lib/permisos';
import { actualizarEmpleado, crearEmpleado, darDeBajaEmpleado, getEmpleados, type Empleado } from '@/services/empleados';

type Formulario = { id: string | null; nombre: string; apellido: string; email: string; telefono: string; password: string; permisos: string[] };
const VACIO: Formulario = { id: null, nombre: '', apellido: '', email: '', telefono: '', password: '', permisos: [] };

// Usuarios del panel (solo administrador): cuentas de empleados y las secciones que puede usar cada uno
export default function AdminEmpleadosPage() {
  const [lista, setLista] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Formulario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  useEffect(() => {
    let vigente = true;
    getEmpleados()
      .then((empleados) => vigente && setLista(empleados))
      .catch((e) => vigente && mostrar(e instanceof Error ? e.message : 'No se pudieron cargar los empleados', 'peligro'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [mostrar]);

  const reemplazar = (e: Empleado) => setLista((actual) => actual.map((x) => (x.id === e.id ? e : x)));

  const abrirNuevo = () => {
    setError(null);
    setForm({ ...VACIO });
  };
  const abrirEdicion = (e: Empleado) => {
    setError(null);
    setForm({ id: e.id, nombre: e.nombre, apellido: e.apellido, email: e.email, telefono: e.telefono, password: '', permisos: e.permisos });
  };

  const alternarPermiso = (clave: string) =>
    setForm((f) => (f ? { ...f, permisos: f.permisos.includes(clave) ? f.permisos.filter((p) => p !== clave) : [...f.permisos, clave] } : f));

  const guardar = async () => {
    if (!form) return;
    setError(null);
    setGuardando(true);
    try {
      if (form.id) {
        const actualizado = await actualizarEmpleado(form.id, {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          permisos: form.permisos,
          ...(form.password ? { password: form.password } : {}),
        });
        reemplazar(actualizado);
        mostrar('Empleado actualizado.');
      } else {
        const creado = await crearEmpleado({ nombre: form.nombre, apellido: form.apellido, email: form.email, telefono: form.telefono, password: form.password, permisos: form.permisos });
        setLista((actual) => [creado, ...actual]);
        mostrar('Empleado creado. Pasale el email y la contraseña para que ingrese.');
      }
      setForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async (e: Empleado) => {
    const ok = await confirmar(`¿Dar de baja a ${e.nombre} ${e.apellido}?`, {
      texto: 'No va a poder ingresar y se cierran sus sesiones abiertas. Su actividad queda en el registro y podés reactivarla cuando quieras.',
      accion: 'Dar de baja',
    });
    if (!ok) return;
    try {
      reemplazar(await darDeBajaEmpleado(e.id));
      mostrar('Empleado dado de baja.');
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo dar de baja', 'peligro');
    }
  };

  const reactivar = async (e: Empleado) => {
    try {
      reemplazar(await actualizarEmpleado(e.id, { activo: true }));
      mostrar('Empleado reactivado.');
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo reactivar', 'peligro');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Encabezado
        guia="empleados"
        titulo="Empleados"
        descripcion="Cuentas del panel con permisos por sección. Cada empleado ve y usa solo lo que le marcás; el resto le da error aunque escriba la dirección."
        acciones={<Boton variante="principal" icono="mas" onClick={abrirNuevo}>Nuevo empleado</Boton>}
      />
      {aviso}
      {dialogoConfirmar}

      {cargando ? (
        <Tarjeta><p className="m-0 text-sm text-panel-suave">Cargando…</p></Tarjeta>
      ) : lista.length === 0 ? (
        <EstadoVacio icono="clientes" titulo="Todavía no hay empleados" texto="Creá una cuenta y marcale las secciones que puede usar." />
      ) : (
        <div data-guia="lista" className="flex flex-col gap-3">
          {lista.map((e) => (
            <Tarjeta key={e.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                    {e.nombre} {e.apellido}
                    {!e.activo && <Insignia tono="peligro">Dado de baja</Insignia>}
                  </p>
                  <p className="m-0 mt-0.5 break-all text-sm text-panel-suave">{e.email}</p>
                  <p className="m-0 mt-2 flex flex-wrap gap-1.5">
                    {e.permisos.length === 0 ? (
                      <span className="text-[13px] text-panel-suave">Sin secciones: solo ve el Inicio.</span>
                    ) : (
                      e.permisos.map((p) => <Insignia key={p} tono="acento">{ETIQUETAS_SECCION[p as keyof typeof ETIQUETAS_SECCION] ?? p}</Insignia>)
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Boton tamano="sm" onClick={() => abrirEdicion(e)}>Editar</Boton>
                  {e.activo ? (
                    <Boton tamano="sm" variante="peligro" onClick={() => darDeBaja(e)}>Dar de baja</Boton>
                  ) : (
                    <Boton tamano="sm" onClick={() => reactivar(e)}>Reactivar</Boton>
                  )}
                </div>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      <Dialogo
        abierto={form !== null}
        alCerrar={() => setForm(null)}
        titulo={form?.id ? 'Editar empleado' : 'Nuevo empleado'}
        ancho="lg"
        acciones={
          <>
            <Boton onClick={() => setForm(null)}>Cancelar</Boton>
            <Boton variante="principal" cargando={guardando} onClick={guardar}>Guardar</Boton>
          </>
        }
      >
        {form && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" htmlFor="emp-nombre">
                <input id="emp-nombre" className={control} value={form.nombre} maxLength={80} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />
              </Campo>
              <Campo etiqueta="Apellido" htmlFor="emp-apellido">
                <input id="emp-apellido" className={control} value={form.apellido} maxLength={80} onChange={(ev) => setForm({ ...form, apellido: ev.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Email" htmlFor="emp-email" ayuda={form.id ? 'El email no se puede cambiar.' : 'Con este email ingresa al sitio.'}>
              <input id="emp-email" type="email" className={control} value={form.email} disabled={Boolean(form.id)} maxLength={150} onChange={(ev) => setForm({ ...form, email: ev.target.value })} />
            </Campo>
            <Campo
              etiqueta={form.id ? 'Contraseña nueva (opcional)' : 'Contraseña'}
              htmlFor="emp-clave"
              ayuda={form.id ? 'Si la cambiás, se cierran sus sesiones abiertas.' : 'Mínimo 8 caracteres. Después puede cambiarla desde su perfil.'}
            >
              <input id="emp-clave" type="password" autoComplete="new-password" className={control} value={form.password} maxLength={128} onChange={(ev) => setForm({ ...form, password: ev.target.value })} />
            </Campo>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-sm font-medium">Secciones que puede usar</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECCIONES_CON_PERMISO.map((clave) => (
                  <label key={clave} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-panel-borde px-3 py-2 text-sm sm:min-h-10">
                    <input type="checkbox" className="h-4 w-4" checked={form.permisos.includes(clave)} onChange={() => alternarPermiso(clave)} />
                    {ETIQUETAS_SECCION[clave]}
                  </label>
                ))}
              </div>
              <p className="m-0 mt-2 text-[12.5px] text-panel-suave">Configuración, Datos del sitio, Empleados y Actividad son siempre solo del administrador.</p>
            </fieldset>
            {error && <p role="alert" className="m-0 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </Dialogo>
    </div>
  );
}
