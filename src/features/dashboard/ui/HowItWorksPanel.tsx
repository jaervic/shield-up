import styles from './HowItWorksPanel.module.css';

interface MethodStep {
  title: string;
  description: string;
}

export interface HowItWorksPanelProps {
  /** `false` cuando el encabezado lo aporta un `CollapsibleSection`. */
  heading?: boolean;
}

const STEPS: MethodStep[] = [
  {
    title: 'Mide tu punto de partida',
    description:
      'El diagnóstico reparte preguntas según el peso real de cada dominio y ordena tu ruta por impacto en el examen.',
  },
  {
    title: 'Entiende resolviendo',
    description:
      'Las lecciones no se leen: se deciden. Primero te enfrentas al caso, después llega la explicación.',
  },
  {
    title: 'Consolida cada día',
    description:
      'El repaso espaciado te devuelve cada tarjeta justo cuando estás a punto de olvidarla.',
  },
];

/**
 * Explica el método de estudio. Un entorno de aprendizaje rinde más cuando el
 * alumno entiende *por qué* hace lo que hace.
 */
export function HowItWorksPanel({ heading = true }: HowItWorksPanelProps = {}) {
  const content = (
    <>
      <p className={styles.intro}>
        Recordar cuesta; releer no. Por eso aquí decides antes de ver la respuesta: el esfuerzo de
        recuperar la información es lo que la fija en la memoria.
      </p>

      <ol className={styles.steps} role="list">
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );

  if (!heading) return <div className={styles.panel}>{content}</div>;

  return (
    <section className={styles.panel} aria-labelledby="method-title">
      <h2 id="method-title">Cómo aprovechar ShieldUp</h2>
      {content}
    </section>
  );
}
