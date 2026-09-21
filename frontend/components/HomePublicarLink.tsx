'use client';

// Boton de publicar propiedad: solo visible para administradores 

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function HomePublicarLink() {
  const { user, isLoading } = useAuth();

  // Este acceso solo se muestra a usuarios administradores
  if (isLoading || user?.role !== 'admin') {
    return null;
  }

  return (
    <Link
      href="/admin/propiedades/nueva"
      className="rounded-lg border border-[#bdccef] px-6 py-3 text-center text-sm font-semibold text-[#071a52] transition hover:border-red-500 hover:text-red-600"
    >
      Publicar propiedad
    </Link>
  );
}
