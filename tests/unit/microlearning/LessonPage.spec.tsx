import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { isDecisionStep } from '@/domain/lesson';
import {
  resetLessonRepository,
  setLessonRepository,
} from '@/features/microlearning/data/repository';
import { useLessonStore } from '@/features/microlearning/state/lessonStore';
import { LessonPage } from '@/features/microlearning/ui/LessonPage';
import { createMemoryLessonRepository } from '../../helpers/memoryLessonRepository';
import { settle } from '../../helpers/render';

/**
 * Nota sobre `act`: se usa `fireEvent` (envuelto en `act` por RTL) y `settle`
 * en lugar de `user-event`/`findBy*`, porque el `asyncWrapper` de Testing
 * Library desactiva `IS_REACT_ACT_ENVIRONMENT` y genera avisos en React 19.
 */

function renderLessonPage(lessonId: string) {
  return render(
    <MemoryRouter initialEntries={[`/lessons/${lessonId}`]}>
      <Routes>
        <Route path="/lessons/:lessonId" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Avanza la lección respondiendo siempre correctamente, hasta terminarla. */
async function walkLessonToCompletion(maxSteps = 25): Promise<void> {
  for (let guard = 0; guard < maxSteps; guard += 1) {
    const state = useLessonStore.getState();
    if (state.status === 'completed') return;

    const step = state.lesson?.steps[state.stepIndex];
    if (!step) throw new Error('La lección no tiene paso actual.');

    if (!state.revealed) {
      if (isDecisionStep(step)) {
        const correctTexts = step.options
          .filter((option) => step.correctOptionIds.includes(option.id))
          .map((option) => option.text);

        for (const text of correctTexts) {
          fireEvent.click(screen.getByLabelText(text));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Ver explicación' }));
      }
    } else {
      const isLast = state.stepIndex >= (state.lesson?.steps.length ?? 1) - 1;
      fireEvent.click(
        screen.getByRole('button', { name: isLast ? 'Finalizar lección' : 'Continuar' }),
      );
    }

    await settle();
  }

  throw new Error('La lección no terminó en el número de pasos esperado.');
}

afterEach(() => {
  act(() => {
    resetLessonRepository();
    useLessonStore.getState().reset();
  });
});

describe('LessonPage', () => {
  it('carga una lección real y revela la explicación de un escenario', async () => {
    setLessonRepository(createMemoryLessonRepository());

    renderLessonPage('d4-l1');
    await settle();

    expect(
      screen.getByRole('heading', { name: 'Las primeras horas de un incidente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument();

    // El primer paso es un escenario: no se responde, se revela.
    expect(screen.queryByText(/fuente de alta fidelidad/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver explicación' }));
    await settle();

    expect(screen.getByText(/fuente de alta fidelidad/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('no permite comprobar una decisión sin seleccionar nada', async () => {
    setLessonRepository(createMemoryLessonRepository());

    renderLessonPage('d4-l1');
    await settle();

    // Avanza el escenario inicial para llegar a la primera decisión.
    fireEvent.click(screen.getByRole('button', { name: 'Ver explicación' }));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await settle();

    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
  });

  it('recorre la lección completa, la evalúa y la persiste', async () => {
    const repository = createMemoryLessonRepository();
    setLessonRepository(repository);

    renderLessonPage('d4-l1');
    await settle();

    await walkLessonToCompletion();

    expect(screen.getByText('Lección superada')).toBeInTheDocument();
    expect(repository.rows['d4-l1']?.status).toBe('completed');
    expect(repository.rows['d4-l1']?.correctDecisions).toBe(
      repository.rows['d4-l1']?.totalDecisions,
    );
    expect(repository.rows['d4-l1']?.scorePercent).toBe(100);
    expect(repository.rows['d4-l1']?.completedAt).not.toBeNull();
  });
});
