import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatIntervalDays } from '@/shared/utils/format';
import type { Grade } from '@/domain/card';
import type { DomainId } from '@/domain/domain';
import { useFocusMode } from '@/shared/state/focusMode';
import { Button } from '@/shared/ui/Button';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { computeCalibration } from '../engine/calibration';
import { DEFAULT_NEW_LIMIT } from '../engine/queue';
import { selectCurrentCard, useSrsStore } from '../state/srsStore';
import { sessionPlanQueryKey, useSessionPlan } from '../state/useSessionPlan';
import { ConfidencePrompt } from './ConfidencePrompt';
import { FlashcardView } from './FlashcardView';
import { GradeButtons } from './GradeButtons';
import { SessionPlanScreen } from './SessionPlanScreen';
import styles from './ReviewSession.module.css';

const KEY_TO_GRADE: Record<string, Grade> = {
  '1': 'again',
  '2': 'hard',
  '3': 'good',
  '4': 'easy',
};

/** Devolución cualitativa al cerrar la sesión: refuerza el método, no la nota. */
function sessionFeedback(reviewed: number, correct: number): string {
  if (reviewed === 0) return '';
  const accuracy = correct / reviewed;
  if (accuracy >= 0.9) {
    return 'Precisión excelente. Estas tarjetas tardarán bastante en volver.';
  }
  if (accuracy >= 0.7) {
    return 'Buen resultado. Las que has fallado volverán antes: así es como funciona el sistema.';
  }
  return 'Ha costado, y es normal al principio. Las tarjetas difíciles reaparecerán pronto y se irán suavizando.';
}

/**
 * Sesión de repaso: única pieza con estado.
 *
 * Flujo: plan de sesión → (confianza opcional) → revelado → calificación.
 * Toda la programación vive en `engine/`; aquí solo se orquesta la interacción.
 */
export function ReviewSession() {
  const status = useSrsStore((state) => state.status);
  const error = useSrsStore((state) => state.error);
  const index = useSrsStore((state) => state.index);
  const total = useSrsStore((state) => state.queue.length);
  const currentCard = useSrsStore(selectCurrentCard);
  const revealed = useSrsStore((state) => state.revealed);
  const lastScheduledCard = useSrsStore((state) => state.lastScheduledCard);
  const sessionReviews = useSrsStore((state) => state.sessionReviews);
  const sessionReviewed = useSrsStore((state) => state.sessionReviewed);
  const sessionCorrect = useSrsStore((state) => state.sessionCorrect);

  const start = useSrsStore((state) => state.start);
  const reveal = useSrsStore((state) => state.reveal);
  const declareConfidence = useSrsStore((state) => state.declareConfidence);
  const grade = useSrsStore((state) => state.grade);
  const reset = useSrsStore((state) => state.reset);

  const [selectedDomains, setSelectedDomains] = useState<DomainId[]>([]);

  // Plan completo (para saber qué dominios hay disponibles) y plan filtrado.
  // Sin filtro, ambas consultas comparten clave y React Query las unifica.
  const { data: fullPlan } = useSessionPlan();
  const { data: plan, isPending: planPending } = useSessionPlan(
    DEFAULT_NEW_LIMIT,
    selectedDomains,
  );

  const queryClient = useQueryClient();
  const setFocusMode = useFocusMode((state) => state.setActive);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  // Modo concentración mientras dura la sesión.
  useEffect(() => {
    setFocusMode(status === 'reviewing');
    return () => setFocusMode(false);
  }, [status, setFocusMode]);

  // Al cerrar la sesión, el plan queda obsoleto: se recalcula para el próximo día.
  useEffect(() => {
    if (status === 'finished') {
      void queryClient.invalidateQueries({ queryKey: sessionPlanQueryKey });
    }
  }, [status, queryClient]);

  // Devuelve el foco a la primera acción cada vez que cambia la tarjeta, para
  // que el recorrido con teclado no se pierda al desmontarse el botón pulsado.
  useEffect(() => {
    if (status === 'reviewing' && !revealed) {
      firstActionRef.current?.focus();
    }
    // En jsdom `scrollY` es siempre 0, así que no se invoca `scrollTo`.
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, [status, revealed, index]);

  // Espacio revela sin valorar la confianza.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (status !== 'reviewing') return;

      if (!revealed) {
        if (event.code === 'Space' || event.key === 'Enter') {
          event.preventDefault();
          reveal();
        }
        return;
      }

      const mapped = KEY_TO_GRADE[event.key];
      if (mapped) {
        event.preventDefault();
        void grade(mapped);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, revealed, reveal, grade]);

  if (status === 'idle') {
    return (
      <SessionPlanScreen
        plan={plan ?? null}
        availableDomains={fullPlan?.domains ?? []}
        selectedDomains={selectedDomains}
        isPending={planPending}
        onToggleDomain={(domain) =>
          setSelectedDomains((current) =>
            current.includes(domain)
              ? current.filter((candidate) => candidate !== domain)
              : [...current, domain],
          )
        }
        onClearDomains={() => setSelectedDomains([])}
        onStart={() =>
          void start(selectedDomains.length > 0 ? { onlyDomains: selectedDomains } : {})
        }
      />
    );
  }

  if (status === 'loading') {
    return (
      <p className={styles.state} role="status">
        Preparando tu sesión de repaso…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <p>No se pudo cargar la sesión.</p>
        <p className={styles.errorDetail}>{error}</p>
        <Button variant="primary" onClick={() => void start()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (status === 'finished') {
    const accuracy = sessionReviewed > 0 ? Math.round((sessionCorrect / sessionReviewed) * 100) : 0;
    const calibration = computeCalibration(sessionReviews);

    return (
      <section className={styles.summary} aria-labelledby="session-summary-title">
        <h2 id="session-summary-title">Sesión completada</h2>
        {sessionReviewed === 0 ? (
          <p className={styles.state}>
            No hay tarjetas pendientes hoy. Vuelve mañana o añade contenido nuevo.
          </p>
        ) : (
          <>
            <dl className={styles.summaryList}>
              <div>
                <dt>Repasadas</dt>
                <dd>{sessionReviewed}</dd>
              </div>
              <div>
                <dt>Aciertos</dt>
                <dd>{sessionCorrect}</dd>
              </div>
              <div>
                <dt>Precisión</dt>
                <dd>{accuracy}%</dd>
              </div>
            </dl>
            <p className={styles.feedback}>{sessionFeedback(sessionReviewed, sessionCorrect)}</p>

            {calibration.declared > 0 ? (
              <div className={styles.calibration}>
                <h3 className={styles.calibrationTitle}>Calibración de tu confianza</h3>
                <ul className={styles.calibrationList} role="list">
                  <li>
                    Lo tenías seguro: <strong>{calibration.sure.correct}</strong>/
                    {calibration.sure.total}
                  </li>
                  <li>
                    Dudabas: <strong>{calibration.unsure.correct}</strong>/{calibration.unsure.total}
                  </li>
                </ul>
                {calibration.insight ? (
                  <p className={styles.insight}>{calibration.insight}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
        <Button variant="primary" onClick={reset}>
          Volver
        </Button>
      </section>
    );
  }

  if (!currentCard) {
    return <p className={styles.state}>No hay tarjetas en la cola.</p>;
  }

  return (
    <section className={styles.session} aria-label="Sesión de repaso">
      <ProgressBar value={Math.min(index + 1, total)} max={total} label="Progreso de la sesión" />

      <FlashcardView card={currentCard} revealed={revealed} />

      {revealed ? (
        <GradeButtons onGrade={(value) => void grade(value)} />
      ) : (
        <ConfidencePrompt
          onDeclare={declareConfidence}
          onReveal={reveal}
          firstButtonRef={firstActionRef}
        />
      )}

      {/* Anuncio accesible del próximo intervalo tras cada calificación. */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {lastScheduledCard
          ? `Próximo repaso de esta tarjeta ${formatIntervalDays(lastScheduledCard.intervalDays)}.`
          : ''}
      </p>
    </section>
  );
}
