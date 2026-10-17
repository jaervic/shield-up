import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import {
  resetDiagnosticRepository,
  setDiagnosticRepository,
} from '@/features/diagnostic/data/repository';
import { useDiagnosticStore } from '@/features/diagnostic/state/diagnosticStore';
import { DiagnosticPage } from '@/features/diagnostic/ui/DiagnosticPage';
import { makeQuestion } from '../../helpers/question';
import { createMemoryDiagnosticRepository } from '../../helpers/memoryDiagnosticRepository';
import { renderWithProviders, settle } from '../../helpers/render';

afterEach(() => {
  // El reset del store notifica a los suscriptores: debe ocurrir dentro de `act`.
  act(() => {
    resetDiagnosticRepository();
    useDiagnosticStore.getState().reset();
  });
});

describe('DiagnosticPage', () => {
  it('muestra la intro y arranca el test con preguntas reales', async () => {
    setDiagnosticRepository(createMemoryDiagnosticRepository());

    renderWithProviders(<DiagnosticPage />);
    await settle();

    expect(screen.getByRole('heading', { name: 'Test de diagnóstico' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /comenzar el test/i }));
    await settle();

    expect(screen.getByText('Pregunta 1 de 25')).toBeInTheDocument();
  });

  it('permite responder, finalizar y ver los resultados con la ruta', async () => {
    const repository = createMemoryDiagnosticRepository();
    setDiagnosticRepository(repository);

    const first = makeQuestion({
      id: 'q1',
      domain: 4,
      stem: '¿Primera pregunta?',
      options: [
        { id: 'a', text: 'Opción A' },
        { id: 'b', text: 'Opción B' },
      ],
      correctOptionIds: ['a'],
    });
    const second = makeQuestion({
      id: 'q2',
      domain: 1,
      stem: '¿Segunda pregunta?',
      options: [
        { id: 'a', text: 'Opción C' },
        { id: 'b', text: 'Opción D' },
      ],
      correctOptionIds: ['a'],
    });

    // Se inyecta el estado para no depender del banco completo.
    act(() => {
      useDiagnosticStore.setState({
        status: 'in-progress',
        questions: [first, second],
        answers: {},
        index: 0,
        startedAt: '2026-03-01T10:00:00.000Z',
      });
    });

    renderWithProviders(<DiagnosticPage />);
    await settle();

    expect(screen.getByText('¿Primera pregunta?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Opción A'));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('¿Segunda pregunta?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Opción C'));
    fireEvent.click(screen.getByRole('button', { name: /finalizar y ver resultados/i }));
    await settle();

    expect(screen.getByRole('heading', { name: 'Resultado del diagnóstico' })).toBeInTheDocument();
    // "Preparación estimada" muestra 100% con ambas respuestas correctas.
    expect(screen.getByText('Preparación estimada').parentElement).toHaveTextContent('100%');
    expect(screen.getByRole('heading', { name: 'Tu ruta de estudio' })).toBeInTheDocument();
    expect(repository.attempts).toHaveLength(1);
    expect(repository.attempts[0]?.correctCount).toBe(2);
  });

  it('avisa de que las preguntas sin responder cuentan como fallo', async () => {
    setDiagnosticRepository(createMemoryDiagnosticRepository());

    act(() => {
      useDiagnosticStore.setState({
        status: 'in-progress',
        questions: [makeQuestion({ id: 'q1' }), makeQuestion({ id: 'q2' })],
        answers: {},
        index: 0,
        startedAt: '2026-03-01T10:00:00.000Z',
      });
    });

    renderWithProviders(<DiagnosticPage />);
    await settle();

    expect(screen.getByText(/las preguntas sin responder cuentan como fallo/i)).toBeInTheDocument();
  });
});
