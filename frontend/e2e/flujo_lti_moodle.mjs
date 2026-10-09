// Prueba end-to-end LTI 1.3 con Moodle local (RI-01, RI-06, RI-08, RF-20).
// Flujo por ejecucion: el docente entra a Moodle -> lanza la actividad -> llega al asistente
// con su sesion LTI -> evalua un trabajo del alumno (student_identifier = id LTI, sin nombre)
// -> aprueba -> se comprueba que la calificacion aparece en el libro de calificaciones.
//
// Uso: node e2e/flujo_lti_moodle.mjs <ejecuciones> <carpeta-salida>
// Requiere: Moodle en :8081 preparado con scripts/evidencias/moodle_preparar_lti.php,
// backend en :8000 con LTI_* configurado y `npm run dev` en :5173.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const [runs = '1', outDir = '../docs/evidencias/LTI'] = process.argv.slice(2)
const MOODLE = 'http://localhost:8081'
const COURSE_ID = 2
const CMID = 2
const STUDENT_LTI_ID = '4' // claim `sub` del alumno en Moodle (id interno, sin nombre)
const RUBRIC_NAME = 'Ensayo argumentativo'

const ESSAYS = [
  'La energia solar es la mejor alternativa para las comunidades rurales. Reduce costos, no depende de redes y disminuye emisiones.',
  'El uso de celulares en el aula distrae, aunque permite consultar informacion. Debe regularse con reglas claras.',
  'La lectura diaria mejora el vocabulario. Las escuelas deberian fomentar clubes de lectura con apoyo de las familias.',
  'El transporte publico reduce el trafico y la contaminacion. Primero, mueve a mas personas por vehiculo. Segundo, consume menos combustible por pasajero. Por ello, las ciudades deben invertir en el antes que en nuevas vialidades.',
  'Las tareas escolares en exceso generan estres. Propongo limitarlas a treinta minutos diarios.',
  'El reciclaje domestico es insuficiente si la industria no reduce sus empaques. Sostengo que la responsabilidad principal es de los productores, porque generan la mayor parte de los residuos; aun asi, los hogares deben separar la basura.',
  'Aprender una segunda lengua amplia las oportunidades laborales y desarrolla la memoria.',
  'La inteligencia artificial en la escuela puede apoyar al docente, pero no sustituirlo. Su uso debe ser transparente y supervisado, y los estudiantes deben aprender a verificar lo que produce.',
  'El deporte escolar mejora la salud y la convivencia. Deberia haber mas horas de educacion fisica.',
  'Los videojuegos no son solo entretenimiento: algunos desarrollan la resolucion de problemas. Sin embargo, su uso excesivo afecta el sueno, por lo que se requiere moderacion y acompanamiento de los padres.',
]

// Moodle consulta la herramienta por host.docker.internal (red interna de Docker). En el
// host, el firewall de Windows bloquea esa IP de la LAN, asi que el navegador la resuelve
// a 127.0.0.1: las URLs registradas en Moodle no cambian.
const browser = await chromium.launch({
  args: ['--host-resolver-rules=MAP host.docker.internal 127.0.0.1'],
})
mkdirSync(outDir, { recursive: true })

function moodleGrade() {
  const sql =
    "select g.finalgrade from m_grade_grades g join m_grade_items i on i.id = g.itemid " +
    `where i.itemmodule = 'lti' and i.courseid = ${COURSE_ID} and g.userid = ${STUDENT_LTI_ID}`
  const out = execFileSync('docker', ['exec', 'moodle-docker-db-1', 'psql', '-U', 'moodle', '-d', 'moodle', '-tAc', sql])
  const value = out.toString().trim()
  return value === '' ? null : Number(value)
}

async function moodleLogin(page, username) {
  await page.goto(`${MOODLE}/login/index.php`)
  await page.fill('#username', username)
  await page.fill('#password', 'Prueba.AERG.2026')
  await page.click('#loginbtn')
  await page.waitForLoadState('networkidle')
}

const results = []
for (let run = 1; run <= Number(runs); run++) {
  const started = Date.now()
  const prefix = join(outDir, `ejecucion_${String(run).padStart(2, '0')}`)
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()
  const row = { run, success: false, sent: null, received: null, seconds: null, error: '' }
  try {
    // 1. Lanzamiento del docente desde la actividad de Moodle.
    await moodleLogin(page, 'docente1')
    await page.goto(`${MOODLE}/mod/lti/launch.php?id=${CMID}`)
    await page.waitForURL(/localhost:5173\/evaluar/, { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    if (page.url().includes('session_token')) throw new Error('El token no se retiro de la URL')
    await page.screenshot({ path: `${prefix}_1_asistente_tras_launch.png` })

    // 2. Evaluacion de un trabajo del alumno, identificado solo por su id LTI.
    const essay = ESSAYS[(run - 1) % ESSAYS.length]
    await page.setInputFiles('input[type="file"]', {
      name: `trabajo_ejecucion_${run}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(essay),
    })
    await page.fill('input[placeholder="Nombre o matricula"]', STUDENT_LTI_ID)
    const rubricValue = await page
      .locator('select option', { hasText: new RegExp(`^${RUBRIC_NAME} \\(`) })
      .first()
      .getAttribute('value')
    await page.selectOption('select', rubricValue)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.waitForURL(/\/evaluaciones\/\d+\/revision/, { timeout: 120000 })
    await page.waitForLoadState('networkidle')

    // 3. Aprobacion: la respuesta del backend trae la calificacion enviada por AGS.
    await page.getByRole('button', { name: 'Aprobar y enviar' }).click()
    const approveResponse = page.waitForResponse((response) => response.url().endsWith('/approve'))
    await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
    const approved = await (await approveResponse).json()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${prefix}_2_aprobada.png` })
    row.sent = approved.final_total_score
    if (!approved.sent_to_lms_at) throw new Error('El backend no confirmo el envio al LMS')

    // 4. Libro de calificaciones de Moodle.
    row.received = moodleGrade()
    await page.goto(`${MOODLE}/grade/report/grader/index.php?id=${COURSE_ID}`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${prefix}_3_libro_calificaciones.png` })
    row.success = row.received !== null && Math.abs(row.received - row.sent) < 0.005
    if (!row.success) row.error = 'La calificacion recibida no coincide con la enviada'
  } catch (error) {
    row.error = String(error.message ?? error).split('\n')[0]
    await page.screenshot({ path: `${prefix}_error.png` }).catch(() => {})
  }
  row.seconds = Number(((Date.now() - started) / 1000).toFixed(1))
  results.push(row)
  console.log(JSON.stringify(row))
  await context.close()
}
await browser.close()
writeFileSync(join(outDir, 'resultados_flujo.json'), JSON.stringify(results, null, 2))
process.exit(results.every((row) => row.success) ? 0 : 1)
