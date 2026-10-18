import { Link } from 'react-router-dom';
import { getDomain, type DomainId } from '@/domain/domain';
import type { SessionPlan } from '../engine/queue';
import { Button } from '@/shared/ui/Button';
import styles from './SessionPlanScreen.module.css';

export interface SessionPlanScreenProps {
  plan: SessionPlan | null;
  /** Dominios con tarjetas disponibles (del plan sin filtrar). */
  availableDomains: ReadonlyArray<{ domain: DomainId; count: number }>;
  selectedDomains: readonly DomainId[];
  isPending: boolean;
  onToggleDomain: (domain: DomainId) => void;
  onClearDomains: () => void;
  onStart: () => void;
}

/**
 * Pantalla de arranque de la sesión.
 *
 * Antes de empezar, el usuario sabe cuántas tarjetas son, de qué dominios y
 * cuánto va a tardar, y puede centrarse en un solo dominio. Una sesión de
 * duración conocida se empieza mucho más fácil que una de longitud incierta.
 */
export function SessionPlanScreen({
  plan,
  availableDomains,
  selectedDomains,
  isPending,
  onToggleDomain,
  onClearDomains,
  onStart,
}: SessionPlanScreenProps) {
  if (isPending || !plan) {
    return (
      <p className={styles.state} role="status">
        Calculando tu sesión…
      </p>
    );
  }

  const filtered = selectedDomains.length > 0;
  const hasCards = plan.cardCount > 0;

  const filter = availableDomains.length > 1 ? (
    <div className={styles.filter}>
      <p className={styles.filterLabel} id="domain-filter-label">
        ¿Quieres centrarte en un dominio?
      </p>
      <div className={styles.chips} role="group" aria-labelledby="domain-filter-label">
        <button
          type="button"
          className={!filtered ? styles.chipActive : styles.chip}
          aria-pressed={!filtered}
          onClick={onClearDomains}
        >
          Todos
        </button>
        {availableDomains.map(({ domain, count }) => {
          const isActive = selectedDomains.includes(domain);
          return (
            <button
              key={domain}
              type="button"
              className={isActive ? styles.chipActive : styles.chip}
              style={{ borderColor: `var(--domain-${domain})` }}
              aria-pressed={isActive}
              onClick={() => onToggleDomain(domain)}
              title={getDomain(domain).nameEs}
            >
              D{domain}
              <span className={styles.chipCount}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  if (!hasCards) {
    return (
      <section className={styles.empty} aria-labelledby="plan-empty-title">
        <h2 id="plan-empty-title">
          {filtered ? 'Nada pendiente en ese dominio' : 'No hay nada pendiente'}
        </h2>
        <p>
          {filtered
            ? 'Ese dominio no tiene tarjetas para hoy. Prueba con otro o vuelve a la sesión completa.'
            : 'Has repasado todo lo que tocaba hoy. Puedes adelantar con lecciones nuevas o volver mañana: dejar pasar el tiempo es parte del método, no una pausa.'}
        </p>
        {filter}
        <div className={styles.actions}>
          {filtered ? (
            <Button variant="primary" onClick={onClearDomains}>
              Volver a la sesión completa
            </Button>
          ) : null}
          <Link className={styles.primaryLink} to="/lessons">
            Ver lecciones
          </Link>
          {!filtered ? (
            <Link className={styles.secondaryLink} to="/diagnostic">
              Repetir el diagnóstico
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.plan} aria-labelledby="plan-title">
      <h2 id="plan-title">Antes de empezar</h2>

      <p className={styles.headline}>
        <span className={styles.bigNumber}>{plan.cardCount}</span>{' '}
        <span className={styles.headlineText}>
          {plan.cardCount === 1 ? 'tarjeta' : 'tarjetas'} · ~{plan.estimatedMinutes} min
          {filtered ? ' · práctica dirigida' : ''}
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

      {filter}

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
