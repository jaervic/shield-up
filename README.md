# ShieldUp

Web-app educativa para preparar la certificación **CompTIA Security+ (SY0-701)** con
enfoque en *active recall*, *spaced repetition* y simulación de examen.

> Contenido de estudio no oficial. Verifica siempre contra el examen oficial de CompTIA.

---

## Estado del proyecto

**Fases 1, 2 y 3 completadas.**

- **Fase 1 — Arquitectura base + motor de Spaced Repetition.** Dominio tipado, motor SM-2 puro
  y testeado, persistencia offline-first, sesión de repaso funcional y dashboard de métricas.
- **Fase 2 — Test de diagnóstico + ruta de estudio personalizada.** Banco de 41 preguntas
  ponderadas por el peso del examen, motor de selección/corrección y ruta ordenada por impacto.
- **Fase 3 — Microlearning.** 8 lecciones-problema (28 pasos) basadas en *active recall*,
  progreso reanudable y recomendaciones ligadas a la ruta de estudio.

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
├─ app/          # router, providers, layout (AppShell)
├─ domain/       # MODELOS PUROS: Card, Review, Question, DiagnosticAttempt, dominios
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
└─ styles/       # tokens.css, reset.css, global.css
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
