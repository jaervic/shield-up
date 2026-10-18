# ShieldUp

Web-app educativa para preparar la certificación **CompTIA Security+ (SY0-701)** con
enfoque en *active recall*, *spaced repetition* y simulación de examen.

> Contenido de estudio no oficial. Verifica siempre contra el examen oficial de CompTIA.

---

## Estado del proyecto

**Fases 1, 2 y 3 completadas, más una pasada de diseño y accesibilidad.**

- **Fase 1 — Arquitectura base + motor de Spaced Repetition.** Dominio tipado, motor SM-2 puro
  y testeado, persistencia offline-first, sesión de repaso funcional y dashboard de métricas.
- **Fase 2 — Test de diagnóstico + ruta de estudio personalizada.** Banco de 41 preguntas
  ponderadas por el peso del examen, motor de selección/corrección y ruta ordenada por impacto.
- **Fase 3 — Microlearning.** 8 lecciones-problema (28 pasos) basadas en *active recall*,
  progreso reanudable y recomendaciones ligadas a la ruta de estudio.
- **Diseño** — Paleta anclada a la identidad de CompTIA, temas claro/oscuro, interfaz
  mobile-first con barra inferior, **test automático de contraste WCAG** (4 familias de pares) y
  un entorno orientado al estudio: plan de sesión, práctica dirigida por dominio, confianza antes
  de revelar con calibración, objetivo diario, racha, anillos de dominio, hitos, mapa de calor de
  constancia y modo concentración.

## Stack

| Capa | Elección |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | CSS Modules + design tokens (`src/styles/tokens.css`) |
| Estado | Zustand (sesión) + TanStack Query (lecturas agregadas) |
| Persistencia | IndexedDB vía Dexie (offline-first, sin backend) |
| Validación | Zod (contenido) |
| Tests | Vitest + Testing Library |
| Calidad | ESLint (flat config) + Prettier + `tsc --noEmit` |

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo
npm run test       # suite de tests (Vitest)
npm run typecheck  # comprobación de tipos
npm run lint       # ESLint
npm run build      # build de producción
```

---

## Arquitectura

```
src/
├─ app/          # router, providers, layout (AppShell) y tema (theme/)
├─ domain/       # MODELOS PUROS: Card, Review, Question, Lesson, DiagnosticAttempt
├─ data/         # Dexie (IndexedDB) y carga/validación del contenido (Zod)
├─ features/
│  ├─ srs/
│  │  ├─ engine/ # LÓGICA PURA: sm2, scheduler, queue, stats, cardFactory
│  │  ├─ data/   # SrsRepository (interfaz) + adaptador Dexie + servicios
│  │  ├─ state/  # store de Zustand y hooks de métricas
│  │  └─ ui/     # FlashcardView, GradeButtons, ReviewSession
│  ├─ diagnostic/
│  │  ├─ engine/ # LÓGICA PURA: selection, proficiency, scoring, route
│  │  ├─ data/   # DiagnosticRepository + servicio
│  │  ├─ state/  # store del test y hooks de lectura
│  │  └─ ui/     # DiagnosticPage, QuestionCard, DiagnosticResults
│  ├─ microlearning/
│  │  ├─ engine/ # LÓGICA PURA: scoring, progress, recommend
│  │  ├─ data/   # LessonRepository + servicio (reanudable)
│  │  ├─ state/  # store de la sesión de lección y hooks del catálogo
│  │  └─ ui/     # LessonsPage, LessonPage, LessonStepView, LessonResults
│  └─ dashboard/ui/  # DashboardPage, ReadinessPanel, RecommendedLessonsPanel
├─ shared/       # ui/, hooks/, utils/ reutilizables (answer, random, interleave, date, math)
└─ styles/       # tokens.css (temas claro/oscuro), reset.css, global.css
content/
├─ flashcards/   # tarjetas seed (ports, acronyms, crypto, program)
├─ questions/    # banco de preguntas del diagnóstico (d1..d5)
└─ lessons/      # lecciones de microlearning (d1..d5)
```

### Regla de oro

`domain/` y `features/*/engine/` **no importan React, Dexie, Zustand ni TanStack**.
Está impuesto por ESLint (`no-restricted-imports`), de modo que el motor es lógica
pura, testeable en milisegundos y agnóstico de la interfaz. La capa `ui/` no
contiene reglas de negocio.

---

## Motor de Spaced Repetition

### Modelo

```ts
Card {
  id, domain(1-5), type: 'port'|'acronym'|'crypto'|'concept',
  front, back, hint?, tags,
  easeFactor, intervalDays, repetitions, lapses,
  dueAt, createdAt, lastReviewedAt, suspended
}
```

### Algoritmo (SM-2)

- Calificación `Again / Hard / Good / Easy` → escala `q = 0 / 3 / 4 / 5`.
- `EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`, acotado a `[1.3, 3.0]`.
- Fallo (`q < 3`): `repetitions = 0`, `interval = 1 día`, `EF -= 0.2`, `lapses + 1`.
- Acierto: `interval = 1`, luego `6`, luego `round(interval * EF')`.
- `Hard` aplica además un factor `0.8` (desviación documentada del SM-2 original).

`schedule(card, grade, now)` es **pura**: no muta la entrada y recibe `now` por
parámetro, lo que hace los tests deterministas.

### Cola diaria (`buildDailyQueue`)

1. Vencidas (`dueAt <= now`), ordenadas por antigüedad.
2. Nuevas hasta `newLimit` (por defecto 20), con selección determinista por `seed`.
3. **Interleaving ponderado** por los pesos del examen (D4 28%, D2 22%, D3 18%,
   D5 20%, D1 12%) en lugar de agrupar por bloques.

### Extensión a FSRS

La UI depende de la interfaz `Scheduler`, no de SM-2. Migrar a FSRS es añadir un
objeto que cumpla esa interfaz y registrarlo en `SCHEDULER_IDS`: ni los
componentes ni la capa de datos cambian.

### Persistencia y sync

La app depende de `SrsRepository`, no de Dexie. Añadir cuentas/multidispositivo
consiste en implementar otro repositorio (p. ej. Supabase) y registrarlo con
`setSrsRepository`.

---

## Test de diagnóstico y ruta de estudio (Fase 2)

### Selección de preguntas

`selectDiagnosticQuestions` reparte 25 preguntas imitando la composición del examen:
cuotas proporcionales a los pesos oficiales, con el remanente asignado a los dominios
con mayor déficit. Es determinista dada una semilla y se intercala por dominio para no
agrupar bloques temáticos.

### Corrección

`evaluateAttempt` normaliza las respuestas (toda pregunta tiene respuesta, aunque sea
vacía), calcula la proficiencia por dominio y dos métricas:

- `scorePercent`: proporción simple de aciertos.
- `readinessPercent`: media ponderada por el peso de cada dominio en el examen,
  **renormalizada sobre los dominios realmente evaluados** para que un dominio ausente
  no penalice artificialmente.

Una respuesta solo cuenta como correcta si el conjunto seleccionado coincide exactamente
con el conjunto correcto: en preguntas de respuesta múltiple no vale acertar una parte.

### Ruta de estudio

`buildStudyRoute` ordena los dominios por **prioridad = peso en el examen × hueco de
conocimiento**. Así, un 40% de aciertos en Operaciones de Seguridad (28%) genera más
urgencia que el mismo 40% en Conceptos Generales (12%). Cada paso incluye el motivo en
lenguaje natural y una estimación de tarjetas a trabajar.

### Persistencia

Los intentos se guardan en la tabla `diagnosticAttempts` (migración v2 de Dexie) tras la
interfaz `DiagnosticRepository`. El dashboard lee el último intento con TanStack Query y
muestra la preparación estimada y el top 3 de la ruta.

---

## Microlearning (Fase 3)

### Principio: problema antes que explicación

Cada lección alterna dos tipos de paso:

- **`scenario`** — plantea una situación real y no se evalúa. El usuario pulsa «Ver
  explicación» cuando ya se ha formado una opinión.
- **`decision`** — el usuario decide y recibe feedback inmediato (`single` o `multiple`),
  con la respuesta correcta marcada visualmente y una «idea clave» al final.

No hay texto que leer de principio a fin: la explicación llega **después** del intento de
recuerdo, que es lo que consolida la memoria.

### Evaluación

`evaluateLesson` cuenta únicamente los pasos `decision` (los `scenario` son informativos) y
exige un **80%** de aciertos para dar la lección por superada. Una decisión múltiple solo
cuenta si el conjunto marcado coincide exactamente con el correcto.

### Progreso reanudable

El progreso se persiste **paso a paso** (`lessonProgress` en Dexie, migración v3), no solo al
final: `beginLesson` reanuda en `currentStepIndex` si la lección quedó a medias, y
`restartLesson` la reinicia descartando las respuestas. Una lección ya superada empieza limpia
al volver a abrirla.

### Recomendaciones ligadas a la ruta

`recommendLessons` hereda la prioridad por dominio de la ruta del diagnóstico y ordena dentro
de cada dominio las lecciones pendientes antes que las superadas. La ruta se pasa **como
parámetro** (`buildRecommendations(route)`), de modo que el microlearning no depende del módulo
de diagnóstico y la UI decide qué intento usar.

---

## Diseño, temas y accesibilidad

### Tema claro y oscuro

El tema se aplica con el atributo `data-theme` en `<html>` y se resuelve en tres pasos:

1. Un **script inline en `index.html`** fija el atributo antes del primer pintado (evita el
   destello de tema incorrecto) leyendo `localStorage` y, si no hay preferencia, el sistema.
2. `src/app/theme/theme.ts` contiene la lógica pura (`resolveTheme`, `otherTheme`), testeada.
3. `themeStore.ts` pinta el DOM y persiste; mientras el usuario no elija, sigue los cambios de
   `prefers-color-scheme` en caliente.

**Regla de oro de color:** los componentes nunca escriben colores literales, solo variables
semánticas. `src/styles/tokens.css` define la paleta oscura en `:root` (base y *fallback* si
faltara el atributo) y el tema claro como única sobreescritura. Añadir un tema nuevo es añadir
un bloque de ~25 líneas.

### Paleta e identidad

La gama está anclada a la identidad de CompTIA, **muestreada del CSS de comptia.org** (no de una
guía de marca, que no está publicada): rojo `#c8102e`, rojo oscuro `#b70f2a`, carbón
`#20282f` / `#0d1013`, gris claro `#f6f7f9`, y los acentos violeta `#4e25a1` y naranja `#cf4400`.

**Dos reglas gobiernan la paleta:**

1. **El rojo es la marca, no el error.** El rojo se reserva a navegación, acciones y progreso.
   El feedback de "no era la mejor opción" usa ámbar y la calificación del repaso una rampa
   ámbar → neutro → verde → violeta. En una app de estudio, marcar el fallo con el mismo color
   que la marca confunde las dos señales.
2. **Relleno y texto se separan.** `--color-primary` es un color de *relleno*;
   `--color-primary-text` es para texto y enlaces. El rojo de marca no alcanza 4.5:1 como texto
   sobre fondo oscuro, así que en tema oscuro la marca se aclara (`#ff4d63`) y el texto encima
   pasa a ser oscuro. Sin esa separación, o el botón o el enlace suspenden contraste.

**Límite de marca:** se usan los colores, no el logotipo ni el wordmark. El símbolo es un escudo
propio (`BrandMark.tsx`) y el aviso de no afiliación es visible en la cabecera
(`UnofficialBadge`), no solo en el pie.

### Test de contraste automático

`tests/unit/theme/contrast.spec.ts` **lee `tokens.css`**, resuelve las referencias `var(--x)` y
comprueba la ratio WCAG de **cuatro familias de pares**:

| Familia | Exigencia | Qué cubre |
|---|---|---|
| Texto sobre fondo | 4.5:1 | Párrafos, etiquetas, enlaces |
| Bordes e indicadores | 3:1 | Fronteras de controles y barras |
| Texto sobre relleno de acento | 4.5:1 | Estados *hover* de los botones |
| Texto sobre fondo translúcido | 4.5:1 | Opciones marcadas e insignias |

El cuarto caso es el que más rinde: los tokens `*-soft` son `rgba`, así que su contraste real
depende del fondo sobre el que se **componen**. El test compone el color y lo comprueba.

También verifica que **no hay tokens definidos y sin usar** y, para no pasar por la razón
equivocada, incluye pruebas de la propia aritmética (negro sobre blanco = 21:1, el gris límite
`#767676` = 4.54:1, y la composición de un alfa).

**Defectos reales que ha detectado:** el rojo de marca como borde sobre superficies (2.54:1),
`--color-border-strong` por debajo de 3:1 en ambos temas, y dos combinaciones de texto sobre
fondo translúcido (ámbar 4.24:1 y verde 4.36:1 en tema claro). Todos corregidos.

### Mobile-first

- **Barra de navegación inferior** fija en pantallas < 48 rem, con iconos, estado activo
  reforzado con forma (no solo color) y `aria-current` que aporta React Router.
- **Áreas táctiles de 44 px mínimo** (`--tap-min`) en botones y navegación.
- **Tipografía fluida** con `clamp()`: no hay saltos de tamaño entre móvil y escritorio.
- **`viewport-fit=cover`** y `env(safe-area-inset-*)` para el notch y la barra gestual.
- **Tablas y gráficos anchos** se envuelven en regiones desplazables con `tabindex="0"` y
  etiqueta accesible, de modo que también se recorren con el teclado (WCAG 1.4.10).
- Botones de acción a ancho completo en pantallas estrechas.

### Entorno de aprendizaje

- **Plan de sesión antes de empezar** (`summarizeQueue`): cuántas tarjetas son, de qué dominios
  y cuánto se tarda. Una sesión de duración conocida se empieza mucho más fácil que una de
  longitud incierta.
- **Práctica dirigida por dominio**: desde el plan se puede limitar la sesión a uno o varios
  dominios (`onlyDomains`). Útil para machacar el que más pesa en el examen.
- **Confianza antes de revelar** (`ConfidencePrompt`): declarar si lo sabías o dudabas revela en
  el mismo gesto, así que no añade un clic. Es *metacognición*, y alimenta
  `computeCalibration`, que cruza la predicción con el resultado real para detectar la
  **ilusión de saber** —el error de estudio más común—. Es opcional: se puede revelar sin valorar.
  Los dos botones son **neutros a propósito**: son una autoevaluación, no un resultado, y
  pintarlos de verde/rojo prejuzgaría la respuesta.
- **Objetivo diario y racha** (`computeStudyStreak`): el panel abre con lo único que hay que
  hacer hoy. La racha no se rompe hasta perder un día completo.
- **Anillo de dominio** (`computeDomainMastery`): una tarjeta madura cuenta 1 y una joven 0.5.
  Ver el anillo llenarse motiva más que leer un porcentaje.
- **Mapa de calor de constancia** (`computeActivityHeatmap`): 12 semanas de actividad. El gráfico
  es `role="img"` con resumen textual, así que la intensidad del color es una señal redundante
  y no el único canal de información.
- **Hitos** (`computeMilestones`): derivados de datos que ya existen, sin tabla de logros.
- **Modo concentración**: durante la sesión la cabecera deja de ser fija y el pie desaparece.
  La navegación **no** se oculta: quitarla dejaría al usuario sin vía de salida.
- **Explicación del método**: un alumno rinde más cuando entiende *por qué* decide antes de leer
  la respuesta.
- **Micro-animaciones** en el contenido revelado, solo si el usuario no pidió movimiento reducido.
- **Foco y desplazamiento gestionados**: al cambiar de tarjeta o de paso, el foco vuelve a la
  acción principal y la vista sube arriba, para que el recorrido con teclado no se pierda.
- **Feedback cualitativo al cerrar la sesión**, centrado en el proceso y no en la nota.

### Revisión visual y auditoría de layout

La suite de tests no ve el aspecto. Para eso hay dos herramientas en `scripts/`
(requieren `npx playwright install chromium` una vez):

```bash
npm run dev            # en otra terminal
npm run shots          # capturas de las pantallas clave, en ambos temas y viewports
npm run audit:layout   # auditoría medida en navegador real
```

`audit-layout.mjs` comprueba **hechos medibles**, no impresiones: desbordamiento
horizontal por viewport, elementos que se salen del viewport y objetivos táctiles por
debajo de 44 px. `screenshots.mjs` siembra datos reales conduciendo la interfaz (diagnóstico,
lección, repasos) antes de capturar, así que las capturas muestran la app en uso.

**Defectos que encontró la primera pasada y que la suite no podía ver:**

| Defecto | Medición |
|---|---|
| La página se desplazaba en horizontal en móvil | 59 px de desbordamiento a 360 px |
| El gráfico de carga ocupaba barras de 72 px | El `min-width` del gráfico forzaba el desbordamiento |
| Barras de progreso, anillos y mapa de calor **invisibles** | `--color-surface-2` sobre `--color-surface` = 1.17:1 |
| Objetivos táctiles de 23 px en los títulos de lección | Por debajo del mínimo AA de 24 px |
| Los botones de calificación quedaban fuera de pantalla al revelar | Obligaba a desplazarse en cada tarjeta |

El caso de la "pista invisible" se resolvió con un token propio: `--color-track` (~2:1),
deliberadamente por debajo de 3:1 porque es la referencia **vacía** de una barra, no la frontera
de un control. El test de contraste documenta por qué queda fuera de la lista de 3:1.

---

## Pesos oficiales del examen (SY0-701)

| Dominio | Peso |
|---|---|
| 1 · General Security Concepts | 12% |
| 2 · Threats, Vulnerabilities & Mitigations | 22% |
| 3 · Security Architecture | 18% |
| 4 · Security Operations | 28% |
| 5 · Security Program Management & Oversight | 20% |

---

## Accesibilidad (WCAG)

- HTML semántico (`header`, `nav`, `main`, `section`, `article`), skip-link y `lang="es"`.
- Atajos de teclado: `Espacio`/`Enter` revela, `1-4` califica.
- `aria-live` anuncia el próximo intervalo de repaso.
- Gestión de foco al cambiar de tarjeta y `:focus-visible` con anillo de foco.
- Contraste de texto verificado ≥ 4.5:1 y respeto de `prefers-reduced-motion`.

---

## Hoja de ruta

- [x] **Fase 1** — Arquitectura + motor SRS
- [x] **Fase 2** — Dashboard de diagnóstico + test inicial que personaliza la ruta
- [x] **Fase 3** — Microlearning (lecciones-problema)
- [ ] **Fase 4** — PBQ: drag & drop (`dnd-kit`) + terminal simulada (`xterm.js`)
- [ ] **Fase 5** — Simulador de examen (90 preguntas / 90 min / marcado para revisión)
- [ ] **Fase 6** — Sync multidispositivo y cuentas
