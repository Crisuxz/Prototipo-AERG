// RNF-06: captura las 6 pantallas en 3 tamanos y verifica que no haya desbordamiento
// horizontal (scrollWidth <= innerWidth). Requiere backend + `npm run dev` en ejecucion.
// Uso: node e2e/capturas_rnf06.mjs [baseUrl] [evaluationId] [rubricId] [salida]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const [baseUrl = 'http://localhost:5173', evaluationId = '2', rubricId = '1', outDir = '../docs/evidencias/RNF-06'] =
  process.argv.slice(2)

const screens = [
  ['inicio', '/'],
  ['evaluar', '/evaluar'],
  ['revision', `/evaluaciones/${evaluationId}/revision`],
  ['rubricas', '/rubricas'],
  ['detalle_rubrica', `/rubricas/${rubricId}`],
  ['historial', '/historial'],
]
const viewports = [
  [1366, 768],
  [768, 1024],
  [375, 812],
]

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const rows = []
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } })
  for (const [name, path] of screens) {
    await page.goto(baseUrl + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const { scrollWidth, innerWidth, offenders } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      // Elementos que sobresalen del viewport, para localizar la causa si falla.
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`),
    }))
    const file = `${name}_${width}x${height}.png`
    await page.screenshot({ path: join(outDir, file), fullPage: true })
    rows.push({ name, width, height, scrollWidth, innerWidth, ok: scrollWidth <= innerWidth, offenders, file })
    console.log(`${scrollWidth <= innerWidth ? 'OK  ' : 'FAIL'} ${file} scrollWidth=${scrollWidth} innerWidth=${innerWidth} ${offenders.join(' ')}`)
  }
  await page.close()
}
await browser.close()

const passed = rows.filter((row) => row.ok).length
const table = [
  '# RNF-06 — Verificación responsive',
  '',
  `Fecha: ${new Date().toISOString()} · Navegador: Chromium (Playwright) · Base: ${baseUrl}`,
  '',
  'Criterio automático: `document.documentElement.scrollWidth <= window.innerWidth` (sin desbordamiento horizontal).',
  '',
  '| Pantalla | Viewport | scrollWidth | innerWidth | Resultado | Captura |',
  '|---|---|---|---|---|---|',
  ...rows.map(
    (row) =>
      `| ${row.name} | ${row.width}×${row.height} | ${row.scrollWidth} | ${row.innerWidth} | ${row.ok ? 'Sin desbordamiento' : 'DESBORDA: ' + row.offenders.join(', ')} | [${row.file}](${row.file}) |`,
  ),
  '',
  `**Total: ${passed}/${rows.length} sin desbordamiento horizontal.**`,
  '',
]
writeFileSync(join(outDir, 'resumen_responsive.md'), table.join('\n'))
process.exit(passed === rows.length ? 0 : 1)
