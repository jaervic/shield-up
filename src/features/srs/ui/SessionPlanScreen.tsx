import { Link } from 'react-router-dom';
import type { SessionPlan } from '../engine/queue';
import { Button } from '@/shared/ui/Button';
import styles from './SessionPlanScreen.module.css';

export interface SessionPlanScreenProps {
  plan: SessionPlan | null;
  isPending: boolean;
  onStart: () => void;
}

/**
 * Pantalla de arranque de la sesión.
 *
 * Antes de empezar, el usuario sabe cuántas tarjetas son, de qué dominios y
 * cuánto va a tardar. Una sesión de duración conocida se empieza mucho más
 * fácil que una de longitud incierta.
 */
export function SessionPlanScreen({ plan, isPending, onStart }: SessionPlanScreenProps) {
  if (isPending || !plan) {
    return (
      <p className={styles.state} role="status">
        Calculando tu sesión…
      </p>
    );
  }

  if (plan.cardCount === 0) {
    return (
      <section className={styles.empty} aria-labelledby="plan-empty-title">
        <h2 id="plan-empty-title">No hay nada pendiente</h2>
        <p>
          Has repasado todo lo que tocaba hoy. Puedes adelantar con lecciones nuevas o volver
          mañana: dejar pasar el tiempo es parte del método, no una pausa.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} to="/lessons">
            Ver lecciones
          </Link>
          <Link className={styles.secondaryLink} to="/diagnostic">
            Repetir el diagnóstico
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.plan} aria-labelledby="plan-title">
      <h2 id="plan-title">Antes de empezar</h2>

      <p className={styles.headline}>
        <span className={styles.bigNumber}>{plan.cardCount}</span>
        <span className={styles.headlineText}>
          {plan.cardCount === 1 ? 'tarjeta' : 'tarjetas'} · ~{plan.estimatedMinutes} min
        </span>
      </p>

      <dl className={styles.breakdown}>
        <div>
          <dt>Vencidas</dt>
          <dd>{plan.dueCount}</dd>
        </div>
        <div>
          <dt>Nuevas</dt>
          <dd>{plan.newCount}</dd>
        </div>
      </dl>

      <ul className={styles.domains} role="list">
        {plan.domains.map(({ domain, count }) => (
          <li
            key={domain}
            className={styles.chip}
            style={{ borderColor: `var(--domain-${domain})` }}
          >
            D{domain}
            <span className={styles.chipCount}>{count}</span>
          </li>
        ))}
      </ul>

      <p className={styles.why}>
        Aproximadamente veinte segundos por tarjeta. Puedes parar cuando quieras: el progreso se
        guarda tarjeta a tarjeta.
      </p>

      <Button variant="primary" onClick={onStart}>
        Empezar sesión
      </Button>
    </section>
  );
}
