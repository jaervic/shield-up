# ShieldUp

Web-app educativa para preparar la certificación **CompTIA Security+ (SY0-701)** con
enfoque en *active recall*, *spaced repetition* y simulación de examen.

> Contenido de estudio no oficial. Verifica siempre contra el examen oficial de CompTIA.

---

## Estado del proyecto

**Fase 1 completada: arquitectura base + motor de Spaced Repetition.**
Incluye dominio tipado, motor SM-2 puro y testeado, persistencia offline-first,
sesión de repaso funcional y un dashboard inicial de métricas.

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
├─ domain/       # MODELOS PUROS: Card, Review, dominios y pesos del examen
├─ data/         # Dexie (IndexedDB) y carga/validación del contenido
├─ features/
│  ├─ srs/
│  │  ├─ engine/ # LÓGICA PURA: sm2, scheduler, queue, stats, cardFactory
│  │  ├─ data/   # SrsRepository (interfaz) + adaptador Dexie + servicios
│  │  ├─ state/  # store de Zustand y hooks de métricas
│  │  └─ ui/     # FlashcardView, GradeButtons, ReviewSession
│  └─ dashboard/ui/
├─ shared/       # ui/, hooks/, utils/ reutilizables
└─ styles/       # tokens.css, reset.css, global.css
content/
└─ flashcards/   # contenido seed en JSON (ports, acronyms, crypto, program)
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
- [ ] **Fase 2** — Dashboard de diagnóstico + test inicial que personaliza la ruta
- [ ] **Fase 3** — Microlearning (lecciones-problema)
- [ ] **Fase 4** — PBQ: drag & drop (`dnd-kit`) + terminal simulada (`xterm.js`)
- [ ] **Fase 5** — Simulador de examen (90 preguntas / 90 min / marcado para revisión)
- [ ] **Fase 6** — Sync multidispositivo y cuentas
