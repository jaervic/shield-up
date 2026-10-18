import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BackupSnapshot, BackupSummary } from '@/domain/backup';
import { BACKUP_VERSION } from '@/domain/backup';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/utils/format';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch';
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

type Feedback = { kind: 'message' | 'error'; text: string } | null;

/**
 * Ajustes: idioma, tema, copia de seguridad y reinicio del progreso.
 *
 * El progreso vive en el navegador, así que poder sacarlo y volverlo a meter no
 * es una función secundaria: es lo que evita perder meses de repaso al limpiar
 * los datos o cambiar de dispositivo.
 */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [pendingImport, setPendingImport] = useState<BackupSnapshot | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
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

  function describeError(cause: unknown, fallbackKey: 'error.download' | 'error.read' | 'error.restore' | 'error.reset'): string {
    return cause instanceof Error ? cause.message : t(fallbackKey);
  }

  async function handleExport(): Promise<void> {
    setBusy(true);
    setFeedback(null);
    try {
      downloadBackup(await collectBackup());
      setFeedback({ kind: 'message', text: t('settings.downloaded') });
    } catch (cause) {
      setFeedback({ kind: 'error', text: describeError(cause, 'error.download') });
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo fichero.
    event.target.value = '';
    if (file === undefined) return;

    setFeedback(null);
    try {
      setPendingImport(await readBackupFile(file));
    } catch (cause) {
      setPendingImport(null);
      setFeedback({ kind: 'error', text: describeError(cause, 'error.read') });
    }
  }

  async function confirmImport(): Promise<void> {
    if (pendingImport === null) return;
    setBusy(true);
    try {
      await restoreBackup(pendingImport);
      setPendingImport(null);
      setFeedback({ kind: 'message', text: t('settings.restored') });
      await refreshEverything();
    } catch (cause) {
      setFeedback({ kind: 'error', text: describeError(cause, 'error.restore') });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(): Promise<void> {
    setBusy(true);
    setFeedback(null);
    try {
      await resetProgress();
      setResetText('');
      setFeedback({ kind: 'message', text: t('settings.resetDone') });
      await refreshEverything();
    } catch (cause) {
      setFeedback({ kind: 'error', text: describeError(cause, 'error.reset') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>{t('settings.title')}</h1>
        <p className={styles.lead}>{t('settings.lead')}</p>
      </header>

      {feedback !== null ? (
        <p
          className={feedback.kind === 'error' ? styles.error : styles.message}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="settings-appearance">
        <h2 id="settings-appearance" className={styles.sectionTitle}>
          {t('settings.appearance')}
        </h2>
        <LanguageSwitch />
        <ThemeSelector />
      </section>

      <section className={styles.section} aria-labelledby="settings-backup">
        <h2 id="settings-backup" className={styles.sectionTitle}>
          {t('settings.backup')}
        </h2>

        {summary === null ? (
          <p className={styles.text} role="status">
            {t('settings.calculating')}
          </p>
        ) : (
          <ul className={styles.summary} role="list">
            <li>{t('settings.cards', { count: summary.cards })}</li>
            <li>{t('settings.reviews', { count: summary.reviews })}</li>
            <li>{t('settings.diagnostics', { count: summary.diagnosticAttempts })}</li>
            <li>{t('settings.lessons', { count: summary.lessonProgress })}</li>
            <li>{t('settings.pbq', { count: summary.pbqAttempts })}</li>
            <li>{t('settings.exams', { count: summary.examAttempts })}</li>
          </ul>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void handleExport()} disabled={busy}>
            {t('settings.download')}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
            {t('settings.import')}
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
          <div
            className={styles.confirm}
            role="alertdialog"
            aria-label={t('settings.importTitle')}
          >
            <p>
              {t('settings.importFrom', {
                date: formatDateTime(pendingImport.exportedAt),
                count: summarizeBackup(pendingImport).totalRecords,
              })}
            </p>
            <p className={styles.warning}>
              <strong>{t('settings.importWarning')}</strong> {t('settings.importWarningExtra')}
            </p>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => void confirmImport()} disabled={busy}>
                {busy ? t('settings.importing') : t('settings.importConfirm')}
              </Button>
              <Button onClick={() => setPendingImport(null)}>{t('settings.cancel')}</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.danger} aria-labelledby="settings-reset">
        <h2 id="settings-reset" className={styles.sectionTitle}>
          {t('settings.danger')}
        </h2>
        <p className={styles.text}>{t('settings.dangerText')}</p>

        <label className={styles.confirmLabel}>
          <span>{t('settings.resetLabel', { word: RESET_CONFIRMATION })}</span>
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
          {t('settings.resetAction')}
        </Button>
      </section>

      <p className={styles.version}>{t('settings.formatVersion', { version: BACKUP_VERSION })}</p>
    </div>
  );
}
