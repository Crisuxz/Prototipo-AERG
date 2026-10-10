# RNF-06 — Interfaz responsive

**Herramienta:** Playwright 1.64.0 (Chromium headless) · **Script:** `frontend/e2e/capturas_rnf06.mjs`
**Datos:** creados por la API con `scripts/evidencias/sembrar_datos.py` (base `backend/evidencias.db`, textos ficticios).
**Pantallas:** inicio, evaluar, revisión (`/evaluaciones/2/revision`), rúbricas, detalle de rúbrica (`/rubricas/1`), historial.
**Tamaños:** 1366×768 (escritorio), 768×1024 (tableta), 375×812 (móvil).
**Criterio automático:** `document.documentElement.scrollWidth <= window.innerWidth`.

## Resultado

| Ejecución | Sin desbordamiento | Detalle |
|---|---|---|
| Antes de corregir | **7/18** (solo pasaban las 6 de escritorio y "evaluar" en tableta) | [`antes/resumen_responsive.md`](antes/resumen_responsive.md) |
| Después de corregir | **18/18** | [`despues/resumen_responsive.md`](despues/resumen_responsive.md) |

## Causa y corrección (cambios mínimos de Tailwind en `frontend/src/layouts/AppLayout.tsx`)

1. La barra lateral tenía ancho fijo `w-64` (256 px) en todos los tamaños. Ahora, por debajo de `lg` (1024 px), se convierte en una barra superior con navegación horizontal desplazable (`flex-col lg:flex-row`, `lg:w-64`, `overflow-x-auto`).
2. `main` era `flex-1` sin `min-w-0`, por lo que se estiraba al ancho mínimo de las tablas (`min-w-[820px]`) y anulaba su `overflow-x-auto`. Se añadió `min-w-0` y un padding adaptable (`p-4 sm:p-6 lg:p-8`).
3. El botón "Cerrar sesión" se oculta por debajo de `lg` (no tenía acción asociada; ver RNF-07, hallazgo H3-01).

Observación: en 375 px las tablas (historial, criterios de la revisión) se desplazan horizontalmente **dentro de su tarjeta**, no la página. Se registra como hallazgo de usabilidad de severidad 2 en RNF-07.
