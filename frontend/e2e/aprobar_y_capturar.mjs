// RNF-07: aprueba una evaluacion desde la interfaz y captura la notificacion y el historial.
// Uso: node e2e/aprobar_y_capturar.mjs <evaluationId> <prefijo-de-salida> [baseUrl]
import { chromium } from 'playwright'

const [evaluationId, prefix, baseUrl = 'http://localhost:5173'] = process.argv.slice(2)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
await page.goto(`${baseUrl}/evaluaciones/${evaluationId}/revision`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Aprobar y enviar' }).click()
await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
await page.waitForResponse((response) => response.url().endsWith(`/evaluations/${evaluationId}`))
await page.waitForTimeout(300)
await page.screenshot({ path: `${prefix}_notificacion.png` })
await page.goto(`${baseUrl}/historial`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${prefix}_historial.png` })
await browser.close()
