import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { renderWithProviders } from '../../helpers/render';

describe('CollapsibleSection', () => {
  it('renderiza el encabezado y el contenido', () => {
    renderWithProviders(
      <CollapsibleSection title="Hitos" titleId="milestones-title">
        <p>Contenido de apoyo</p>
      </CollapsibleSection>,
    );

    expect(screen.getByRole('heading', { name: 'Hitos' })).toHaveAttribute(
      'id',
      'milestones-title',
    );
    expect(screen.getByText('Contenido de apoyo')).toBeInTheDocument();
    expect(screen.getByText('Hitos').closest('summary')).not.toBeNull();
  });

  it('arranca abierta cuando no hay matchMedia (escritorio y test)', () => {
    const { container } = renderWithProviders(
      <CollapsibleSection title="Hitos">x</CollapsibleSection>,
    );

    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('sincroniza el estado al plegar y volver a desplegar', () => {
    const { container } = renderWithProviders(
      <CollapsibleSection title="Hitos">x</CollapsibleSection>,
    );
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(true);

    act(() => {
      details.open = false;
      fireEvent(details, new Event('toggle'));
    });
    expect(details.open).toBe(false);

    act(() => {
      details.open = true;
      fireEvent(details, new Event('toggle'));
    });
    expect(details.open).toBe(true);
  });
});
