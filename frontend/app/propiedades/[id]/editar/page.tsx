"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditarPropiedadRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/admin/propiedades/nueva?editar=${params.id}`);
    } else {
      router.replace("/admin/propiedades");
    }
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-slate-600">
      <p>Redirigiendo a edición de propiedad...</p>
    </div>
  );
}
