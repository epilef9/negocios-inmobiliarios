import { request } from './api';

export type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  permisos: string[];
  activo: boolean;
  createdAt?: string;
};

export type DatosEmpleado = {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
  permisos: string[];
};

export const getEmpleados = () => request<Empleado[]>('/empleados');
export const crearEmpleado = (datos: DatosEmpleado) => request<Empleado>('/empleados', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarEmpleado = (id: string, datos: Partial<Omit<DatosEmpleado, 'email'>> & { activo?: boolean }) =>
  request<Empleado>(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
export const darDeBajaEmpleado = (id: string) => request<Empleado>(`/empleados/${id}`, { method: 'DELETE' });
