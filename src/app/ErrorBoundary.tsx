import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Dónde ocurrió, para el mensaje ("esta sección" / "la aplicación"). */
  scope?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Red de seguridad de la interfaz.
 *
 * Se monta en dos niveles: en la raíz, para que un fallo no deje una pantalla en
 * blanco; y dentro del layout, alrededor del contenido, para que una sección que
 * reviente no se lleve por delante la navegación.
 *
 * Tiene que ser una clase: React solo expone `getDerivedStateFromError` por esta
 * vía, no hay equivalente con hooks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Fallo de interfaz:', error, info.componentStack);
  }

  private readonly handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const scope = this.props.scope ?? 'la aplicación';

    return (
      <div className={styles.fallback} role="alert">
        <h1 className={styles.title}>Algo se ha roto en {scope}</h1>
        <p className={styles.text}>
          El progreso guardado no se ha tocado. Puedes intentar continuar o recargar la página.
        </p>
        <p className={styles.detail}>{error.message}</p>

        <div className={styles.actions}>
          <Button variant="primary" onClick={this.handleRetry}>
            Reintentar
          </Button>
          <Button onClick={() => window.location.reload()}>Recargar la página</Button>
        </div>
      </div>
    );
  }
}
