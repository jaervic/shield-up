import type { Card } from '@/domain/card';
import { getDomain } from '@/domain/domain';
import styles from './FlashcardView.module.css';

export interface FlashcardViewProps {
  card: Card;
  revealed: boolean;
}

const TYPE_LABELS: Record<Card['type'], string> = {
  port: 'Puertos',
  acronym: 'Acrónimos',
  crypto: 'Criptografía',
  concept: 'Conceptos',
};

/**
 * Tarjeta de repaso: SOLO presenta el contenido.
 * El revelado y la calificación los orquesta `ReviewSession`, porque ahora el
 * revelado pasa por la valoración de confianza.
 */
export function FlashcardView({ card, revealed }: FlashcardViewProps) {
  const domain = getDomain(card.domain);

  return (
    <article className={styles.card} aria-labelledby={`card-${card.id}-question`}>
      <header className={styles.header}>
        <span className={styles.badge} style={{ borderColor: `var(--domain-${card.domain})` }}>
          Dominio {card.domain} · {domain.nameEs}
        </span>
        <span className={styles.type}>{TYPE_LABELS[card.type]}</span>
      </header>

      <h2 id={`card-${card.id}-question`} className={styles.question}>
        {card.front}
      </h2>

      {card.hint && !revealed ? (
        <p className={styles.hint}>
          <span className={styles.hintLabel}>Pista:</span> {card.hint}
        </p>
      ) : null}

      {revealed ? (
        <div className={`${styles.answer} reveal`} aria-live="polite">
          <h3 className={styles.answerLabel}>Respuesta</h3>
          <p className={styles.answerText}>{card.back}</p>
        </div>
      ) : null}
    </article>
  );
}
