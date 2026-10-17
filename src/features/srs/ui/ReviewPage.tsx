import { ReviewSession } from './ReviewSession';
import styles from './ReviewPage.module.css';

export function ReviewPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Repaso espaciado</h2>
        <p>
          Recuerda activamente antes de revelar. La dificultad que marques ajusta cuándo volverás
          a ver esta tarjeta.
        </p>
      </header>
      <ReviewSession />
    </div>
  );
}
