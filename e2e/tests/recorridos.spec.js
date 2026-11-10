// Recorridos principales, de punta a punta y en orden:
//   1. Una persona se registra, confirma su email e ingresa.
//   2. Agenda una visita desde la ficha de la propiedad.
//   3. Manda una solicitud de alquiler con su documentación.
//   4. El administrador confirma la visita y aprueba la solicitud desde el panel.
// La base de prueba la prepara preparar-base.js (un admin y una propiedad en alquiler).
const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

const CLIENTE = { nombre: 'Lucía', apellido: 'Prueba', telefono: '3434556677' };
const nombreCompleto = `${CLIENTE.nombre} ${CLIENTE.apellido}`;

// PDF mínimo: el servidor revisa que empiece con %PDF-
const pdf = (nombre) => ({ name: nombre, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4\n% ${nombre}\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n`) });

async function ingresar(page, email, clave) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('1. registrarse, confirmar el email e ingresar', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Nombre', { exact: true }).fill(CLIENTE.nombre);
  await page.getByLabel('Apellido').fill(CLIENTE.apellido);
  await page.getByLabel('Email').fill(process.env.E2E_CLIENTE_EMAIL);
  await page.getByLabel('Teléfono (opcional)').fill(CLIENTE.telefono);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.E2E_CLIENTE_CLAVE);
  await page.getByLabel('Repetí la contraseña').fill(process.env.E2E_CLIENTE_CLAVE);
  await page.getByLabel(/Leí y acepto/).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // Sin servicio de mails, el sitio muestra el enlace de confirmación (el mismo que llegaría por mail)
  const enlace = page.getByRole('link', { name: 'Confirmar mi email ahora' });
  await expect(enlace).toBeVisible();
  const destino = new URL(await enlace.getAttribute('href'));
  await page.goto(destino.pathname + destino.search);
  // Al confirmar, la cuenta queda con la sesión iniciada
  await expect(page.getByText('tu email quedó confirmado y ya ingresaste')).toBeVisible();
});

test('2. agendar una visita desde la ficha', async ({ page }) => {
  await ingresar(page, process.env.E2E_CLIENTE_EMAIL, process.env.E2E_CLIENTE_CLAVE);
  await page.goto(`/propiedades/${process.env.E2E_PROPIEDAD_ID}`);
  await page.getByRole('button', { name: 'Agendar una visita' }).first().click();

  const dialogo = page.getByRole('dialog', { name: 'Agendar una visita' });
  await dialogo.getByLabel('Nombre y apellido').fill(nombreCompleto);
  await dialogo.getByLabel('Teléfono').fill(CLIENTE.telefono);
  // El primer día con horarios libres (puede estar en el mes que viene) y su primer horario
  let dia = dialogo.getByRole('button', { name: /horarios libres/ }).first();
  if (!(await dia.isVisible().catch(() => false))) {
    await dialogo.getByRole('button', { name: 'Mes siguiente' }).click();
    dia = dialogo.getByRole('button', { name: /horarios libres/ }).first();
  }
  await dia.click();
  await dialogo.getByRole('button', { name: /^\d{2}:\d{2} h$/ }).first().click();
  await dialogo.getByRole('button', { name: 'Pedir la visita' }).click();
  await expect(dialogo.getByText('Pedido enviado')).toBeVisible();
});

test('3. mandar una solicitud de alquiler con la documentación', async ({ page }) => {
  await ingresar(page, process.env.E2E_CLIENTE_EMAIL, process.env.E2E_CLIENTE_CLAVE);
  await page.goto(`/solicitudes/nueva?propiedad=${process.env.E2E_PROPIEDAD_ID}&operacion=alquiler`);

  const datos = {
    'Nombre *': CLIENTE.nombre,
    'Apellido *': CLIENTE.apellido,
    'DNI *': '30123456',
    'CUIL/CUIT *': '27301234568',
    'Fecha de nacimiento *': '1995-05-10',
    'Correo electrónico *': process.env.E2E_CLIENTE_EMAIL,
    'Teléfono *': CLIENTE.telefono,
    'Domicilio actual *': 'San Martín 100',
    'Localidad *': 'Libertador San Martín',
    'Provincia *': 'Entre Ríos',
    'Ocupación o actividad laboral *': 'Docente',
    'Ingresos mensuales *': '950000',
  };
  for (const [etiqueta, valor] of Object.entries(datos)) await page.getByLabel(etiqueta, { exact: true }).first().fill(valor);

  await page.getByLabel('Adjuntar DNI del titular · frente').setInputFiles(pdf('dni-frente.pdf'));
  await page.getByLabel('Adjuntar DNI del titular · dorso').setInputFiles(pdf('dni-dorso.pdf'));
  await page.getByLabel('Adjuntar Constancia de CUIL/CUIT').setInputFiles(pdf('cuil.pdf'));
  await page.getByLabel('Adjuntar Comprobante de domicilio actual').setInputFiles(pdf('domicilio.pdf'));
  await page.getByLabel('Adjuntar Recibos de sueldo').setInputFiles([pdf('recibo-1.pdf'), pdf('recibo-2.pdf'), pdf('recibo-3.pdf')]);
  await page.getByLabel(/Seguro de caución/).check();

  await page.getByRole('button', { name: 'Confirmar y enviar solicitud' }).click();
  await expect(page.getByRole('heading', { name: '¡Solicitud enviada correctamente!' })).toBeVisible({ timeout: 60_000 });
});

test('4. el administrador confirma la visita y aprueba la solicitud', async ({ page }) => {
  await ingresar(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_CLAVE);
  // La primera vez que entra al panel ve la bienvenida
  await page.goto('/admin');
  const entrar = page.getByRole('link', { name: /Entrar al panel/ });
  if (await entrar.isVisible().catch(() => false)) await entrar.click();

  await page.goto('/admin/visitas');
  await page.getByRole('button', { name: `Confirmar la visita de ${nombreCompleto}` }).first().click();
  await expect(page.getByText(`Confirmaste la visita de ${nombreCompleto}.`)).toBeVisible();

  await page.goto('/admin/solicitudes');
  await page.getByRole('button', { name: 'Ver solicitud' }).first().click();
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await expect(page.getByText('Aprobada').first()).toBeVisible();
});
