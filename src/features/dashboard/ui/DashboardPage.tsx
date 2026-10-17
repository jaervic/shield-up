import { DOMAINS } from '@/domain/domain';
import { formatPercent } from '@/shared/utils/format';
import { useSrsStats } from '@/features/srs/state/useSrsStats';
import styles from './DashboardPage.module.css';

/** Dashboard de diagnóstico: estado del progreso y punto de entrada al repaso. */
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
      <section aria-labelledby="overview-title">
        <h2 id="overview-title">Resumen</h2>
        <dl className={styles.metrics}>
          <Metric label="Tarjetas totales" value={stats.total} />
          <Metric label="Pendientes hoy" value={stats.dueToday} />
          <Metric label="Nuevas" value={stats.newCards} />
          <Metric label="Consolidadas" value={stats.mature} />
          <Metric label="Retención" value={formatPercent(stats.retentionRate)} />
          <Metric label="Repasos" value={stats.totalReviews} />
        </dl>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title">Progreso por dominio</h2>
        <ul className={styles.domains} role="list">
          {DOMAINS.map((domain) => {
            const domainStats = stats.byDomain[domain.id];
            const studied = domainStats.total - domainStats.newCards;
            const percent = domainStats.total > 0 ? (studied / domainStats.total) * 100 : 0;

            return (
              <li key={domain.id} className={styles.domainRow}>
                <div className={styles.domainHeader}>
                  <span className={styles.domainName}>
                    <span
                      className={styles.domainDot}
                      style={{ backgroundColor: `var(--domain-${domain.id})` }}
                      aria-hidden="true"
                    />
                    D{domain.id} · {domain.nameEs}
                  </span>
                  <span className={styles.domainWeight}>
                    {Math.round(domain.weight * 100)}% del examen
                  </span>
                </div>
                <div
                  className={styles.bar}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={domainStats.total}
                  aria-valuenow={studied}
                  aria-label={`Progreso en ${domain.nameEs}`}
                >
                  <div className={styles.barFill} style={{ width: `${percent}%` }} />
                </div>
                <p className={styles.domainMeta}>
                  {studied} de {domainStats.total} vistas · {domainStats.dueToday} pendientes ·{' '}
                  {domainStats.mature} consolidadas
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="load-title">
        <h2 id="load-title">Carga de repaso (14 días)</h2>
        <ul className={styles.loadChart} role="list">
          {load.map((point) => (
            <li key={point.date} className={styles.loadBar}>
              <span
                className={styles.loadBarFill}
                style={{ height: `${(point.count / maxLoad) * 100}%` }}
                title={`${point.date}: ${point.count} tarjetas`}
              />
              <span className={styles.loadCount}>{point.count}</span>
            </li>
          ))}
        </ul>
      </section>
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
