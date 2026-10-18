import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import type { ExamAttempt } from '@/domain/exam';
import { loadQuestions } from '@/data/content/loadQuestions';
import { examLengthFor } from '@/features/exam/engine/selection';
import { resetExamRepository, setExamRepository } from '@/features/exam/data/repository';
import type { ExamRepository } from '@/features/exam/data/examRepository';
import { useExamStore } from '@/features/exam/state/examStore';
import { ExamPage } from '@/features/exam/ui/ExamPage';
import { renderWithProviders, settle, settleUntil } from '../../helpers/render';

function memoryRepository(): ExamRepository & { attempts: ExamAttempt[] } {
  const attempts: ExamAttempt[] = [];
  return {
    attempts,
    async saveAttempt(attempt) {
      attempts.push(attempt);
    },
    async getAttempts() {
      return [...attempts];
    },
    async getLatestAttempt() {
      return attempts[attempts.length - 1] ?? null;
    },
    async clear() {
      attempts.length = 0;
    },
  };
}

afterEach(() => {
  act(() => {
    resetExamRepository();
    useExamStore.getState().reset();
  });
});

describe('ExamPage', () => {
  it('presenta el plan y arranca el simulacro', async () => {
    setExamRepository(memoryRepository());

    renderWithProviders(<ExamPage />, ['/exam']);
    await settleUntil(() => screen.queryByRole('button', { name: /comenzar simulacro/i }) !== null);

    // El examen nunca pasa de 90 preguntas, aunque el banco sea mayor.
    const length = examLengthFor(loadQuestions().length);
    expect(screen.getByRole('heading', { name: 'Simulador de examen' })).toBeInTheDocument();
    expect(screen.getByText(String(length))).toBeInTheDocument();
    expect(screen.getByText('Aprobado').parentElement).toHaveTextContent('750/900');
    // Con el banco a escala real (>=90% de 90) no se avisa de proporcionalidad.
    expect(screen.queryByText(/simulacro proporcional/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /comenzar simulacro/i }));
    await settleUntil(() => screen.queryByRole('timer') !== null);

    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('Pregunta 1 de ' + length)).toBeInTheDocument();
  });

  it('permite responder, marcar y entregar, y guarda el intento', async () => {
    const repository = memoryRepository();
    setExamRepository(repository);

    const { container } = renderWithProviders(<ExamPage />, ['/exam']);
    await settleUntil(() => screen.queryByRole('button', { name: /comenzar simulacro/i }) !== null);
    fireEvent.click(screen.getByRole('button', { name: /comenzar simulacro/i }));
    await settleUntil(() => screen.queryByRole('timer') !== null);

    const total = examLengthFor(loadQuestions().length);

    // Responder la primera: se marca la primera opción del enunciado.
    const firstOption = container.querySelector('fieldset input');
    expect(firstOption).not.toBeNull();
    fireEvent.click(firstOption as Element);
    await settle();

    // Marcarla para revisar.
    const flagButton = screen.getByRole('button', { name: /marcar para revisar/i });
    fireEvent.click(flagButton);
    await settle();
    expect(screen.getByRole('button', { name: /quitar marca/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Ir a la última pregunta por el navegador.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Pregunta ${total},`) }));
    await settle();
    expect(screen.getByText(`Pregunta ${total} de ${total}`)).toBeInTheDocument();

    // Entregar: primero aparece la confirmación con el resumen.
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }));
    await settle();
    const confirm = screen.getByText(/vas a entregar con/i);
    expect(confirm).toHaveTextContent(String(total - 1));
    expect(confirm).toHaveTextContent(/1 marcadas/i);

    fireEvent.click(screen.getByRole('button', { name: /entregar ahora/i }));
    await settleUntil(() => screen.queryByText('Simulacro terminado') !== null);

    expect(repository.attempts).toHaveLength(1);
    const attempt = repository.attempts[0];
    expect(attempt?.totalQuestions).toBe(total);
    expect(attempt?.scaledScore).toBeGreaterThanOrEqual(100);
    expect(attempt?.scaledScore).toBeLessThanOrEqual(900);
    expect(screen.getByText(/se aprueba con 750\/900/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Por dominio' })).toBeInTheDocument();
  });
});
