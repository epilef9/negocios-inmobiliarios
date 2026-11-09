import { redirect } from 'next/navigation';

// «Reservas con seña» ahora es una pestaña de Panel → Reservas. Esta dirección queda para los enlaces viejos.
export default function SenasPage() {
  redirect('/admin/reservas?tipo=sena');
}
