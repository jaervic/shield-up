import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TRANSLATIONS, type TranslationKey } from '@/shared/i18n/dictionary';
import { interpolate } from '@/shared/i18n/language';
import { useI18nStore } from '@/shared/i18n/i18nStore';
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

    // Se traduce leyendo el idioma directamente del store: una clase no puede
    // usar hooks, y la pantalla de error debe funcionar pase lo que pase.
    const language = useI18nStore.getState().language;
    const t = (key: TranslationKey): string => TRANSLATIONS[language][key];
    const scope = this.props.scope ?? t('shell.errorApp');

    return (
      <div className={styles.fallback} role="alert">
        <h1 className={styles.title}>{interpolate(t('shell.errorTitle'), { scope })}</h1>
        <p className={styles.text}>{t('shell.errorText')}</p>
        <p className={styles.detail}>{error.message}</p>

        <div className={styles.actions}>
          <Button variant="primary" onClick={this.handleRetry}>
            {t('shell.retry')}
          </Button>
          <Button onClick={() => window.location.reload()}>{t('shell.reload')}</Button>
        </div>
      </div>
    );
  }
}
