import type { Confidence } from '@/domain/card';
import type { Ref } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './ConfidencePrompt.module.css';

export interface ConfidencePromptProps {
  onDeclare: (confidence: Confidence) => void;
  onReveal: () => void;
  /** Ref del primer botón: permite devolver el foco al cambiar de tarjeta. */
  firstButtonRef?: Ref<HTMLButtonElement>;
}

/**
 * Juicio de aprendizaje antes de revelar.
 *
 * Declarar la confianza ANTES de ver la respuesta es lo que convierte el repaso
 * en metacognición: entrena la capacidad de saber lo que uno sabe, y permite
 * detectar la "ilusión de saber". Cada botón revela a la vez, así que no añade
 * un clic extra respecto al flujo anterior.
 *
 * Los dos botones son NEUTROS a propósito: son una autoevaluación, no un
 * resultado. Pintar "lo tenía seguro" en verde daría a entender que es correcto
 * antes de saberlo, que es justo el juicio que estamos midiendo.
 */
export function ConfidencePrompt({ onDeclare, onReveal, firstButtonRef }: ConfidencePromptProps) {
  return (
    <div className={styles.prompt}>
      <p className={styles.question}>Antes de ver la respuesta: ¿lo tenías?</p>

      <div className={styles.actions}>
        <Button ref={firstButtonRef} onClick={() => onDeclare('sure')}>
          Lo tenía seguro
        </Button>
        <Button onClick={() => onDeclare('unsure')}>Dudaba</Button>
      </div>

      <div className={styles.skip}>
        <Button variant="ghost" onClick={onReveal}>
          Revelar sin valorar
          <kbd className={styles.kbd}>Espacio</kbd>
        </Button>
      </div>

      <p className={styles.why}>
        Valorar tu confianza antes de revelar mejora la retención y te muestra cuándo crees saber
        algo que todavía no dominas.
      </p>
    </div>
  );
}
