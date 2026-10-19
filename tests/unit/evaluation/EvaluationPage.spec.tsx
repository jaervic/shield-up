import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { EvaluationPage } from '@/features/evaluation/ui/EvaluationPage';
import { renderWithProviders, settle } from '../../helpers/render';

describe('EvaluationPage', () => {
  it('reúne diagnóstico, simulacro y PBQ con enlaces directos', async () => {
    renderWithProviders(<EvaluationPage />);
    await settle();

    expect(screen.getByRole('heading', { name: 'Evaluación', level: 1 })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Hacer el diagnóstico' })).toHaveAttribute(
      'href',
      '/diagnostic',
    );
    expect(screen.getByRole('link', { name: 'Hacer un simulacro' })).toHaveAttribute(
      'href',
      '/exam',
    );
    expect(screen.getByRole('link', { name: 'Ver simulaciones' })).toHaveAttribute('href', '/pbq');
  });

  it('presenta las tres actividades como encabezados de sección', async () => {
    renderWithProviders(<EvaluationPage />);
    await settle();

    for (const title of ['Test de diagnóstico', 'Simulacro de examen', 'Simulaciones (PBQ)']) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument();
    }
  });
});
