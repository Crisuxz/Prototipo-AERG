# Manual del docente

Este prototipo **no califica solo**. Propone una evaluación fundamentada en tu rúbrica
y te la entrega para que la revises, la ajustes y la apruebes. Nada se envía a ningún
lado hasta que tú lo apruebas.

## 1. Antes de empezar

Abre la aplicación en tu navegador. El menú lateral tiene cinco secciones: Dashboard,
Rúbricas, Evaluar trabajo, Historial y el acceso a cada evaluación desde el historial.

## 2. Crear una rúbrica

1. Ve a **Rúbricas → Nueva rúbrica**.
2. Escribe el nombre y, si quieres, una descripción.
3. En **Instrucciones** puedes indicar criterios de aplicación general que quieres que
   la IA tenga en cuenta siempre que use esta rúbrica (por ejemplo: «prioriza la
   solidez de la argumentación sobre la extensión»).
4. Añade criterios. Cada criterio necesita:
   - un **peso** (el peso de todos los criterios debe sumar **100**; la suma se muestra
     en vivo mientras editas);
   - al menos **dos niveles de desempeño**, cada uno con nombre y puntaje (por ejemplo:
     Insuficiente 1, Suficiente 2, Bueno 3, Excelente 4).
5. Guarda. La rúbrica queda en **Borrador**.
6. Cuando esté lista, pulsa **Publicar**.

> Sólo se puede evaluar con rúbricas publicadas. Si la suma de pesos no es 100 o algún
> criterio tiene menos de dos niveles, la aplicación te lo dirá y no publicará.

**Editar y archivar.** Si editas una rúbrica publicada, su versión sube. Las
evaluaciones anteriores **no cambian**: cada una guardó una copia de la rúbrica tal
como era el día que se usó. Una rúbrica que ya se usó no se puede borrar; archívala
para que deje de aparecer al evaluar sin perder el historial.

## 3. Evaluar un trabajo

1. Ve a **Evaluar trabajo**.
2. **Sube el archivo** (arrastrándolo o seleccionándolo). Se aceptan `.pdf`, `.docx` y
   `.txt`, hasta el tamaño máximo configurado. Verás el texto extraído para confirmar
   que el documento se leyó bien.
3. **Elige la rúbrica publicada** con la que quieres evaluar.
4. Opcionalmente añade **instrucciones para esta evaluación** (por ejemplo: «es un
   primer borrador, sé constructivo con la redacción»).
5. Pulsa **Generar evaluación**. Tarda unos segundos: el sistema consulta al modelo,
   valida su respuesta y calcula los puntajes.

Al terminar, te lleva directamente a la pantalla de revisión.

## 4. Revisar y ajustar

La pantalla de revisión muestra una tarjeta por criterio con:

- el **nivel** que la IA seleccionó y el **puntaje sugerido**;
- la **retroalimentación** y la **evidencia** citada del trabajo;
- una **sugerencia de mejora**.

Puedes cambiar el puntaje y reescribir la retroalimentación de cualquier criterio, y
editar la **retroalimentación general**. El total se recalcula automáticamente. Pulsa
**Guardar cambios** cuando termines.

Cada modificación que haces queda registrada en el panel **Cambios del docente**, con
el valor anterior y el nuevo. Esa es la evidencia de tu intervención.

**Regenerar.** Si la propuesta no te convence, pulsa **Regenerar**. Puedes añadir
instrucciones nuevas. Se genera una propuesta adicional; la anterior **no se borra** y
sigue visible en el panel **Generaciones de IA**.

## 5. Aprobar

Cuando la evaluación refleje tu criterio, pulsa **Aprobar** y confirma.

Al aprobar:

- la evaluación queda **congelada**: ya no se puede editar, regenerar ni volver a
  aprobar;
- se registra quién aprobó y cuándo;
- el resultado se envía a la integración con el LMS que esté activa.

Es una acción deliberadamente irreversible: es el momento en que tú asumes la
calificación como propia.

## 6. Historial

En **Historial** ves todas las evaluaciones, con filtros por estado y por rúbrica.
Al abrir cualquiera puedes reconstruir todo lo que pasó: la rúbrica exacta que se usó,
cada propuesta de la IA, cada cambio que hiciste y el resultado enviado al LMS.

## 7. Estados de una evaluación

| Estado | Significado |
|---|---|
| Propuesta generada | La IA respondió y el backend validó y calculó. Te toca revisar. |
| En revisión | Ya hiciste al menos un cambio. |
| Aprobada | Congelada y enviada al LMS. |
| Fallida | La generación no se pudo completar. Puedes intentar regenerarla. |

## 8. Si algo sale mal

| Mensaje | Qué significa y qué hacer |
|---|---|
| Tipo de archivo no permitido | Sólo `.pdf`, `.docx` y `.txt`. Convierte el documento. |
| El archivo es demasiado grande | Supera el máximo configurado. Reduce el archivo o pide al administrador que suba el límite. |
| El documento no contiene texto | Suele ser un PDF escaneado (imágenes sin texto). Hace falta un documento con texto seleccionable. |
| No se pudo leer el archivo | El archivo está dañado. Vuelve a exportarlo. |
| La rúbrica no está publicada | Publícala antes de evaluar. |
| El servicio de IA tardó demasiado / no está disponible | Problema temporal del proveedor. Reintenta en unos minutos. |
| La respuesta de la IA no fue válida | El modelo no respetó el formato ni en el reintento. Vuelve a generar; el intento fallido queda registrado. |
| Esta rúbrica ya se usó | No se puede borrar. Archívala. |

Todo fallo queda registrado en el sistema con su detalle, de modo que puedes revisarlo
después o reportarlo con información concreta.

## 9. Lo que el sistema garantiza

- **Ninguna calificación se emite sin tu aprobación.**
- El puntaje final **siempre** lo calcula el sistema con la fórmula de la rúbrica,
  nunca el modelo de lenguaje: la sugerencia de la IA se guarda aparte, como
  referencia.
- Si un trabajo contiene instrucciones dirigidas a la IA para manipular su
  calificación, el sistema lo detecta, lo registra y **evalúa el trabajo igual**; los
  puntajes siguen limitados a los niveles de tu rúbrica.
- Cada evaluación conserva la rúbrica exacta con la que se hizo, aunque después la
  edites.
