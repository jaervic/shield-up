import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { LoadingSkeleton, Skeleton } from '@/shared/ui/Skeleton';
import { renderWithProviders } from '../../helpers/render';

describe('Skeleton', () => {
  it('es decorativo: los lectores de pantalla lo ignoran', () => {
    const { container } = renderWithProviders(<Skeleton width="50%" height="2rem" />);

    const skeleton = container.querySelector('span');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveStyle({ width: '50%', height: '2rem' });
  });
});

describe('LoadingSkeleton', () => {
  it('anuncia la carga con texto accesible mientras muestra los huecos', () => {
    const { container } = renderWithProviders(<LoadingSkeleton label="Cargando métricas…" lines={3} />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando métricas…');
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(3);
  });
});
