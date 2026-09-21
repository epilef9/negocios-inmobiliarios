"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function EditarPropiedadRedirect() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/");
      return;
    }

    if (params?.id) {
      router.replace(`/admin/propiedades/nueva?editar=${params.id}`);
    } else {
      router.replace("/admin/propiedades");
    }
  }, [params, router, user, isLoading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-slate-600">
      <p>Redirigiendo...</p>
    </div>
  );
}
