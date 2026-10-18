import { formatDayMonth } from '@/shared/utils/format';
import { useSrsStats } from '@/features/srs/state/useSrsStats';
import styles from './ActivityHeatmap.module.css';

const LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * Mapa de calor de las últimas 12 semanas.
 *
 * El nivel se expresa con `data-level` en lugar de clases dinámicas: mantiene el
 * estilo en el CSS y evita el indexado dinámico del módulo.
 *
 * El gráfico es `role="img"` con un resumen textual: la intensidad del color es
 * una señal redundante, no el único canal de información (WCAG 1.1.1). Cada
 * celda lleva además su recuento en el `title`.
 */
export function ActivityHeatmap() {
  const { data, isPending } = useSrsStats();

  if (isPending || !data) {
    return <p role="status">Cargando tu actividad…</p>;
  }

  const { heatmap } = data;

  return (
    <section aria-labelledby="activity-title">
      <h2 id="activity-title">Tu constancia</h2>
      <p className={styles.intro}>
        {heatmap.activeDays === 0
          ? 'Aún no hay actividad. El primer día es el que más cuesta.'
          : `${heatmap.activeDays} de ${heatmap.weeks * 7} días con repasos · ${heatmap.totalReviews} repasos · mejor día: ${heatmap.maxCount}`}
      </p>

      <div className={styles.grid} role="img" aria-label={heatmap.summary}>
        {heatmap.days.map((day) => (
          <span
            key={day.date}
            className={styles.cell}
            data-level={day.level}
            title={`${formatDayMonth(day.date)}: ${day.count} ${day.count === 1 ? 'repaso' : 'repasos'}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className={styles.legend} aria-hidden="true">
        <span>Menos</span>
        {LEVELS.map((level) => (
          <span key={level} className={styles.cell} data-level={level} />
        ))}
        <span>Más</span>
      </p>
    </section>
  );
}
