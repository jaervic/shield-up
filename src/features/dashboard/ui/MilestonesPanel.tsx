import { useLatestDiagnostic } from '@/features/diagnostic/state/useDiagnostic';
import { useLessonCatalog } from '@/features/microlearning/state/useLessons';
import { computeMilestones } from '@/features/srs/engine/milestones';
import { useSrsStats } from '@/features/srs/state/useSrsStats';
import { LoadingSkeleton } from '@/shared/ui/Skeleton';
import styles from './MilestonesPanel.module.css';

export interface MilestonesPanelProps {
  /** `false` cuando el encabezado lo aporta un `CollapsibleSection`. */
  heading?: boolean;
}

/**
 * Hitos de estudio derivados de los datos ya existentes.
 *
 * No se guarda nada nuevo: los logros se recalculan. Ver avance concreto es lo
 * que sostiene el hábito, y el hábito es lo que hace funcionar la repetición
 * espaciada.
 */
export function MilestonesPanel({ heading = true }: MilestonesPanelProps = {}) {
  const { data, isPending } = useSrsStats();
  const { data: catalog } = useLessonCatalog();
  const { data: attempt } = useLatestDiagnostic();

  if (isPending || !data) {
    return <LoadingSkeleton label="Cargando hitos…" />;
  }

  const completedLessons = catalog
    ? Object.values(catalog.byDomain).reduce((sum, summary) => sum + summary.completed, 0)
    : 0;

  const milestones = computeMilestones({
    totalReviews: data.stats.totalReviews,
    currentStreak: data.streak.current,
    matureCards: data.stats.mature,
    completedLessons,
    readinessPercent: attempt?.readinessPercent ?? null,
  });

  const achieved = milestones.filter((milestone) => milestone.achieved).length;

  const content = (
    <>
      <p className={styles.intro}>
        {achieved} de {milestones.length} conseguidos. Se recalculan solos: no hay nada que
        registrar.
      </p>

      <ul className={styles.list} role="list">
        {milestones.map((milestone) => (
          <li
            key={milestone.id}
            className={milestone.achieved ? styles.achieved : styles.pending}
          >
            <span className={styles.marker} aria-hidden="true">
              {milestone.achieved ? '✓' : `${Math.round(milestone.progress * 100)}%`}
            </span>
            <span className={styles.body}>
              <span className={styles.label}>{milestone.label}</span>
              <span className={styles.detail}>
                {milestone.achieved ? 'Conseguido' : milestone.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );

  if (!heading) return content;

  return (
    <section aria-labelledby="milestones-title">
      <h2 id="milestones-title">Hitos</h2>
      {content}
    </section>
  );
}
