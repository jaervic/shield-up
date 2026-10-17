import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

/** Renderiza un componente con los providers que usa la app (Query + Router). */
export function renderWithProviders(
  ui: ReactElement,
  initialEntries: string[] = ['/'],
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Vacía las tareas pendientes (consultas y handlers async) dentro de `act`.
 *
 * Se usa junto a `fireEvent` en lugar de `user-event`/`findBy*`: el
 * `asyncWrapper` de Testing Library desactiva `IS_REACT_ACT_ENVIRONMENT` y
 * provoca avisos espurios de React 19.
 */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

