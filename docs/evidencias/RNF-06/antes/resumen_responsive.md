# RNF-06 — Verificación responsive

Fecha: 2026-10-09T21:57:24.790Z · Navegador: Chromium (Playwright) · Base: http://localhost:5173

Criterio automático: `document.documentElement.scrollWidth <= window.innerWidth` (sin desbordamiento horizontal).

| Pantalla | Viewport | scrollWidth | innerWidth | Resultado | Captura |
|---|---|---|---|---|---|
| inicio | 1366×768 | 1366 | 1366 | Sin desbordamiento | [inicio_1366x768.png](inicio_1366x768.png) |
| evaluar | 1366×768 | 1366 | 1366 | Sin desbordamiento | [evaluar_1366x768.png](evaluar_1366x768.png) |
| revision | 1366×768 | 1366 | 1366 | Sin desbordamiento | [revision_1366x768.png](revision_1366x768.png) |
| rubricas | 1366×768 | 1366 | 1366 | Sin desbordamiento | [rubricas_1366x768.png](rubricas_1366x768.png) |
| detalle_rubrica | 1366×768 | 1366 | 1366 | Sin desbordamiento | [detalle_rubrica_1366x768.png](detalle_rubrica_1366x768.png) |
| historial | 1366×768 | 1366 | 1366 | Sin desbordamiento | [historial_1366x768.png](historial_1366x768.png) |
| inicio | 768×1024 | 1142 | 768 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, button.flex.h-9.w-9, svg.[object.SVGAnimatedString] | [inicio_768x1024.png](inicio_768x1024.png) |
| evaluar | 768×1024 | 768 | 768 | Sin desbordamiento | [evaluar_768x1024.png](evaluar_768x1024.png) |
| revision | 768×1024 | 1142 | 768 | DESBORDA: main.flex-1.p-8, div.max-w-6xl, header.mt-3.flex.flex-wrap, button.rounded-lg.border.border-gray-300, p.mt-4.text-sm.text-gray-500 | [revision_768x1024.png](revision_768x1024.png) |
| rubricas | 768×1024 | 1042 | 768 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, button.flex.items-center.gap-1.5, svg.[object.SVGAnimatedString] | [rubricas_768x1024.png](rubricas_768x1024.png) |
| detalle_rubrica | 768×1024 | 1042 | 768 | DESBORDA: main.flex-1.p-8, div.max-w-5xl, header.mt-3.flex.flex-wrap, button.flex.items-center.gap-1.5, svg.[object.SVGAnimatedString] | [detalle_rubrica_768x1024.png](detalle_rubrica_768x1024.png) |
| historial | 768×1024 | 1142 | 768 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, div., h2.text-2xl.font-semibold.text-gray-900 | [historial_768x1024.png](historial_768x1024.png) |
| inicio | 375×812 | 1142 | 375 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, div., h2.text-2xl.font-semibold.text-gray-900 | [inicio_375x812.png](inicio_375x812.png) |
| evaluar | 375×812 | 618 | 375 | DESBORDA: main.flex-1.p-8, div.max-w-3xl, header.flex.flex-wrap.items-start, div., h2.text-2xl.font-semibold.text-gray-900 | [evaluar_375x812.png](evaluar_375x812.png) |
| revision | 375×812 | 1142 | 375 | DESBORDA: main.flex-1.p-8, div.max-w-6xl, button.flex.items-center.gap-1.5, header.mt-3.flex.flex-wrap, div. | [revision_375x812.png](revision_375x812.png) |
| rubricas | 375×812 | 1042 | 375 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, div., h2.text-2xl.font-semibold.text-gray-900 | [rubricas_375x812.png](rubricas_375x812.png) |
| detalle_rubrica | 375×812 | 1042 | 375 | DESBORDA: main.flex-1.p-8, div.max-w-5xl, button.flex.items-center.gap-1.5, header.mt-3.flex.flex-wrap, div. | [detalle_rubrica_375x812.png](detalle_rubrica_375x812.png) |
| historial | 375×812 | 1142 | 375 | DESBORDA: main.flex-1.p-8, div., header.flex.flex-wrap.items-start, div., h2.text-2xl.font-semibold.text-gray-900 | [historial_375x812.png](historial_375x812.png) |

**Total: 7/18 sin desbordamiento horizontal.**
