import { ReviewSession } from './ReviewSession';
import styles from './ReviewPage.module.css';

export function ReviewPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Repaso espaciado</h1>
        <p>
          Intenta recordar la respuesta antes de revelarla. La calificación que elijas ajusta
          cuándo volverás a ver esta tarjeta: acertar la aleja, fallar la trae de vuelta antes.
        </p>
        <ul className={styles.shortcuts} role="list">
          <li>
            <kbd>Espacio</kbd> revela la respuesta
          </li>
          <li>
            <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd>
            <kbd>4</kbd> califican: Otra vez · Difícil · Bien · Fácil
          </li>
        </ul>
      </header>
      <ReviewSession />
    </div>
  );
}
