import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BackupSnapshot, BackupSummary } from '@/domain/backup';
import { BACKUP_VERSION } from '@/domain/backup';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/utils/format';
import { ThemeSelector } from '@/app/theme/ThemeSelector';
import { summarizeBackup } from '../engine/backup';
import {
  collectBackup,
  downloadBackup,
  readBackupFile,
  resetProgress,
  restoreBackup,
} from '../data/backupService';
import styles from './SettingsPage.module.css';

const RESET_CONFIRMATION = 'REINICIAR';

/**
 * Ajustes: tema, copia de seguridad y reinicio del progreso.
 *
 * El progreso vive en el navegador, así que poder sacarlo y volverlo a meter no
 * es una función secundaria: es lo que evita perder meses de repaso al limpiar
 * los datos o cambiar de dispositivo.
 */
export function SettingsPage() {
  const queryClient = useQueryClient();

  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [pendingImport, setPendingImport] = useState<BackupSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetText, setResetText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSummary = useCallback(async () => {
    setSummary(summarizeBackup(await collectBackup()));
  }, []);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  /** Tras tocar los datos, todo lo cacheado deja de ser válido. */
  async function refreshEverything(): Promise<void> {
    await queryClient.invalidateQueries();
    await refreshSummary();
  }

  async function handleExport(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      downloadBackup(await collectBackup());
      setMessage('Copia descargada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo descargar la copia.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo fichero.
    event.target.value = '';
    if (file === undefined) return;

    setError(null);
    setMessage(null);
    try {
      setPendingImport(await readBackupFile(file));
    } catch (cause) {
      setPendingImport(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo leer la copia.');
    }
  }

  async function confirmImport(): Promise<void> {
    if (pendingImport === null) return;
    setBusy(true);
    try {
      await restoreBackup(pendingImport);
      setPendingImport(null);
      setMessage('Copia restaurada.');
      await refreshEverything();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo restaurar la copia.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await resetProgress();
      setResetText('');
      setMessage('Progreso reiniciado.');
      await refreshEverything();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo reiniciar el progreso.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Ajustes</h1>
        <p className={styles.lead}>
          Tu progreso se guarda solo en este navegador. Descárgalo de vez en cuando: es la única
          forma de recuperarlo si se borran los datos del dispositivo.
        </p>
      </header>

      {error !== null ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {message !== null ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="settings-theme">
        <h2 id="settings-theme" className={styles.sectionTitle}>
          Apariencia
        </h2>
        <ThemeSelector />
      </section>

      <section className={styles.section} aria-labelledby="settings-backup">
        <h2 id="settings-backup" className={styles.sectionTitle}>
          Copia de seguridad
        </h2>

        {summary === null ? (
          <p className={styles.text} role="status">
            Calculando…
          </p>
        ) : (
          <ul className={styles.summary} role="list">
            <li>{summary.cards} tarjetas</li>
            <li>{summary.reviews} repasos</li>
            <li>{summary.diagnosticAttempts} diagnósticos</li>
            <li>{summary.lessonProgress} lecciones con progreso</li>
            <li>{summary.pbqAttempts} intentos de PBQ</li>
            <li>{summary.examAttempts} simulacros</li>
          </ul>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void handleExport()} disabled={busy}>
            Descargar copia
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
            Importar copia
          </Button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFile(event)}
          />
        </div>

        {pendingImport !== null ? (
          <div className={styles.confirm} role="alertdialog" aria-label="Confirmar importación">
            <p>
              La copia es del <strong>{formatDateTime(pendingImport.exportedAt)}</strong> y tiene{' '}
              <strong>{summarizeBackup(pendingImport).totalRecords}</strong> registros.
            </p>
            <p className={styles.warning}>
              Al restaurarla se <strong>sustituye todo tu progreso actual</strong>. Si no has
              descargado una copia antes, hazlo ahora.
            </p>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => void confirmImport()} disabled={busy}>
                {busy ? 'Restaurando…' : 'Sustituir mi progreso'}
              </Button>
              <Button onClick={() => setPendingImport(null)}>Cancelar</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.danger} aria-labelledby="settings-reset">
        <h2 id="settings-reset" className={styles.sectionTitle}>
          Zona de peligro
        </h2>
        <p className={styles.text}>
          Reiniciar borra los repasos, el diagnóstico, el progreso de las lecciones, las PBQ y los
          simulacros. El mazo de tarjetas vuelve a su estado inicial.
        </p>

        <label className={styles.confirmLabel}>
          <span>
            Escribe <code>{RESET_CONFIRMATION}</code> para confirmar
          </span>
          <input
            className={styles.input}
            type="text"
            value={resetText}
            onChange={(event) => setResetText(event.target.value)}
            autoComplete="off"
          />
        </label>

        <Button
          tone="danger"
          disabled={busy || resetText.trim().toUpperCase() !== RESET_CONFIRMATION}
          onClick={() => void handleReset()}
        >
          Reiniciar todo el progreso
        </Button>
      </section>

      <p className={styles.version}>
        Formato de copia: v{BACKUP_VERSION}
      </p>
    </div>
  );
}
