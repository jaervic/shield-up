import { DOMAINS } from '@/domain/domain';
import { formatDayMonth, formatPercent } from '@/shared/utils/format';
import { useSrsStats } from '@/features/srs/state/useSrsStats';
import { ActivityHeatmap } from './ActivityHeatmap';
import { DailyGoalPanel } from './DailyGoalPanel';
import { DomainRing } from './DomainRing';
import { ExamPanel } from './ExamPanel';
import { HowItWorksPanel } from './HowItWorksPanel';
import { MilestonesPanel } from './MilestonesPanel';
import { ReadinessPanel } from './ReadinessPanel';
import { RecommendedLessonsPanel } from './RecommendedLessonsPanel';
import styles from './DashboardPage.module.css';

/**
 * Panel principal. El orden es deliberado: primero lo accionable hoy, después
 * el diagnóstico y las recomendaciones, y al final los datos de apoyo.
 */
export function DashboardPage() {
  const { data, isPending, isError } = useSrsStats();

  if (isPending) {
    return <p role="status">Cargando métricas…</p>;
  }

  if (isError || !data) {
    return <p role="alert">No se pudieron cargar las métricas.</p>;
  }

  const { stats, load } = data;
  const maxLoad = Math.max(1, ...load.map((point) => point.count));

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <h1>Panel de estudio</h1>
        <p>Tu progreso hacia el CompTIA Security+ SY0-701.</p>
      </header>

      <DailyGoalPanel />
      <ExamPanel />
      <ReadinessPanel />
      <RecommendedLessonsPanel />

      <section aria-labelledby="overview-title">
        <h2 id="overview-title">Resumen</h2>
        <dl className={styles.metrics}>
          <Metric label="Tarjetas totales" value={stats.total} />
          <Metric label="Pendientes hoy" value={stats.dueToday} />
          <Metric label="Sin empezar" value={stats.newCards} />
          <Metric label="Consolidadas" value={stats.mature} />
          <Metric label="Retención" value={formatPercent(stats.retentionRate)} />
          <Metric label="Repasos" value={stats.totalReviews} />
        </dl>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title">Dominio por dominio</h2>
        <ul className={styles.domains} role="list">
          {DOMAINS.map((domain) => {
            const domainStats = stats.byDomain[domain.id];
            const studied = domainStats.total - domainStats.newCards;

            return (
              <li key={domain.id} className={styles.domainRow}>
                <DomainRing domain={domain.id} mastery={domainStats.mastery} />
                <div className={styles.domainBody}>
                  <div className={styles.domainHeader}>
                    <span className={styles.domainName}>
                      D{domain.id} · {domain.nameEs}
                    </span>
                    <span className={styles.masteryValue}>
                      {Math.round(domainStats.mastery * 100)}% dominado
                    </span>
                  </div>
                  <p className={styles.domainMeta}>
                    {Math.round(domain.weight * 100)}% del examen · {studied} de {domainStats.total}{' '}
                    vistas · {domainStats.dueToday} pendientes · {domainStats.mature} consolidadas
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <MilestonesPanel />
      <ActivityHeatmap />

      <section aria-labelledby="load-title">
        <h2 id="load-title">Carga de repaso (14 días)</h2>
        <div
          className="scroll-region"
          role="region"
          aria-label="Carga de repaso de los próximos 14 días"
          tabIndex={0}
        >
          <ul className={styles.loadChart} role="list">
            {load.map((point) => (
              <li key={point.date} className={styles.loadBar}>
                <span className={styles.loadValue} aria-hidden="true">
                  {point.count > 0 ? point.count : ''}
                </span>
                <span className={styles.loadTrack} aria-hidden="true">
                  <span
                    className={styles.loadFill}
                    style={{ height: `${(point.count / maxLoad) * 100}%` }}
                  />
                </span>
                <span className={styles.loadDay} aria-hidden="true">
                  {Number(point.date.slice(8, 10))}
                </span>
                <span className="visually-hidden">
                  {formatDayMonth(point.date)}: {point.count} tarjetas
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorksPanel />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.metric}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
