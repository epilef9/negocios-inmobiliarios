import Link from 'next/link';

// Lo que ve quien abre una página de la cuenta sin haber ingresado: qué hay adentro y cómo entrar o crear la cuenta
const QUE_HAY = [
  ['Tus visitas', 'Pedí día y hora para conocer una propiedad y seguí la confirmación.'],
  ['Tus reservas', 'Estadías por días: qué falta confirmar y el pago online.'],
  ['Tus solicitudes', 'Pedidos para alquilar o comprar y los mensajes de la inmobiliaria.'],
  ['Favoritos y avisos', 'Guardá propiedades y enterate cuando entra algo como lo que buscás.'],
];

export default function InvitacionIngresar({ ruta, titulo = 'Ingresá a tu cuenta' }: { ruta: string; titulo?: string }) {
  const volver = encodeURIComponent(ruta);
  return (
    <div className="grid gap-12 border-t border-[#efe9df]/15 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
      <div className="flex flex-col items-start gap-6">
        <p className="font-display m-0 max-w-xl text-[clamp(30px,3.4vw,46px)] leading-[1.05]">{titulo}</p>
        <p className="m-0 max-w-md text-[16px] leading-relaxed text-[#efe9df]/70">Con tu cuenta seguís todo lo que hacés con la inmobiliaria en un solo lugar.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/login?volver=${volver}`}
            className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white"
          >
            <span className="calma-dot" aria-hidden="true" />
            Ingresar
          </Link>
          <Link href={`/register?volver=${volver}`} className="calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]">
            Crear una cuenta
          </Link>
        </div>
        <Link href="/propiedades" className="calma-micro calma-link calma-link-sutil text-[11px] text-[#efe9df]/70">
          O seguí mirando propiedades
        </Link>
      </div>
      <ul className="m-0 grid list-none gap-0 p-0 sm:grid-cols-2 sm:gap-x-10">
        {QUE_HAY.map(([nombre, texto]) => (
          <li key={nombre} className="flex flex-col gap-2 border-t border-[#efe9df]/12 py-6 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
            <span className="font-display text-[24px] leading-none">{nombre}</span>
            <span className="text-[14.5px] leading-relaxed text-[#efe9df]/65">{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
