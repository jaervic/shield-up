import { Link } from 'react-router-dom';
import { DAILY_REVIEW_GOAL } from '@/features/srs/engine/stats';
import { useSrsStats } from '@/features/srs/state/useSrsStats';
import { LoadingSkeleton } from '@/shared/ui/Skeleton';
import styles from './DailyGoalPanel.module.css';

interface EncouragementInput {
  goalMet: boolean;
  reviewedToday: number;
  pending: number;
  newCards: number;
}

/** Microcopy que orienta y motiva según el estado real del día. */
function encouragement({ goalMet, reviewedToday, pending, newCards }: EncouragementInput): string {
  if (goalMet) {
    return 'Objetivo de hoy completado. La constancia es lo que consolida la memoria.';
  }
  if (reviewedToday > 0) {
    const left = DAILY_REVIEW_GOAL - reviewedToday;
    return `Buen ritmo: te quedan ${left} repasos para cerrar el día.`;
  }
  if (pending > 0) {
    return `Tienes ${pending} ${pending === 1 ? 'tarjeta' : 'tarjetas'} esperando. Empezar es lo más difícil.`;
  }
  if (newCards > 0) {
    return 'No hay repasos vencidos. Buen momento para adelantar con tarjetas nuevas.';
  }
  return 'Todo al día. Puedes reforzar con una lección corta.';
}

/**
 * Panel de la sesión diaria: objetivo, racha y estado de las tarjetas.
 * Es lo primero que se ve porque es lo único que hay que hacer hoy.
 */
export function DailyGoalPanel() {
  const { data, isPending } = useSrsStats();

  if (isPending || !data) {
    return <LoadingSkeleton label="Cargando tu progreso…" lines={2} />;
  }

  const { stats, streak, reviewedToday } = data;
  const pending = stats.dueToday;
  const percent = Math.min(100, Math.round((reviewedToday / DAILY_REVIEW_GOAL) * 100));
  const goalMet = reviewedToday >= DAILY_REVIEW_GOAL;

  return (
    <section className={styles.panel} aria-labelledby="daily-goal-title">
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 id="daily-goal-title">Tu sesión de hoy</h2>
          <p className={styles.message}>
            {encouragement({
              goalMet,
              reviewedToday,
              pending,
              newCards: stats.newCards,
            })}
          </p>
        </div>

        <Link className={styles.cta} to="/review">
          {pending > 0 ? 'Empezar repaso' : 'Adelantar repaso'}
        </Link>
      </div>

      <div className={styles.goal}>
        <div className={styles.goalHeader}>
          <span className={styles.goalLabel}>Objetivo diario</span>
          <span className={styles.goalValue}>
            {reviewedToday} / {DAILY_REVIEW_GOAL}
          </span>
        </div>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={DAILY_REVIEW_GOAL}
          aria-valuenow={Math.min(reviewedToday, DAILY_REVIEW_GOAL)}
          aria-label={`Objetivo diario: ${reviewedToday} de ${DAILY_REVIEW_GOAL} repasos`}
        >
          <div
            className={goalMet ? styles.fillDone : styles.fill}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Pendientes hoy</dt>
          <dd>{pending}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Sin empezar</dt>
          <dd>{stats.newCards}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Racha</dt>
          <dd>{streak.current === 1 ? '1 día' : `${streak.current} días`}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Consolidadas</dt>
          <dd>{stats.mature}</dd>
        </div>
      </dl>

      {streak.current === 0 ? (
        <p className={styles.note}>
          Un repaso hoy es suficiente para empezar tu racha. Lo difícil es el primer día.
        </p>
      ) : streak.longest > streak.current ? (
        <p className={styles.note}>Tu mejor racha: {streak.longest} días.</p>
      ) : null}
    </section>
  );
}
