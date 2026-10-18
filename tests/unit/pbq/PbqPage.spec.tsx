import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { loadPbq } from '@/data/content/loadPbq';
import {
  resetPbqRepository,
  setPbqRepository,
} from '@/features/pbq/data/repository';
import { PbqPage } from '@/features/pbq/ui/PbqPage';
import { createMemoryPbqRepository } from '../../helpers/memoryPbqRepository';
import { renderWithProviders, settleUntil } from '../../helpers/render';

const TOPOLOGY_ID = 'pbq-segmentar-red-plana';

function renderPbq(pbqId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/pbq/:pbqId" element={<PbqPage />} />
    </Routes>,
    [`/pbq/${pbqId}`],
  );
}

afterEach(() => {
  act(() => {
    resetPbqRepository();
  });
});

describe('PbqPage · topología', () => {
  it('coloca todos los activos por su zona y supera la simulación', async () => {
    const repository = createMemoryPbqRepository();
    setPbqRepository(repository);

    const pbq = loadPbq().find((candidate) => candidate.id === TOPOLOGY_ID);
    if (pbq === undefined || pbq.kind !== 'topology') throw new Error('Falta la PBQ de topología');

    renderPbq(TOPOLOGY_ID);
    await settleUntil(() => screen.queryByRole('heading', { name: pbq.title }) !== null);

    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
    expect(screen.getByText(/0\/8 colocados/)).toBeInTheDocument();

    // La colocación accesible: un select por activo.
    for (const node of pbq.nodes) {
      fireEvent.change(screen.getByLabelText(`Zona de ${node.label}`), {
        target: { value: node.correctZoneId },
      });
    }

    expect(screen.getByText(/8\/8 colocados/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Comprobar' });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await settleUntil(() => screen.queryByText('Superada') !== null);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(repository.attempts).toHaveLength(1);
    expect(repository.attempts[0]).toMatchObject({ pbqId: TOPOLOGY_ID, passed: true });
  });

  it('explica qué activos están mal colocados y por qué', async () => {
    setPbqRepository(createMemoryPbqRepository());

    const pbq = loadPbq().find((candidate) => candidate.id === TOPOLOGY_ID);
    if (pbq === undefined || pbq.kind !== 'topology') throw new Error('Falta la PBQ de topología');

    renderPbq(TOPOLOGY_ID);
    await settleUntil(() => screen.queryByRole('heading', { name: pbq.title }) !== null);

    // Todo a la misma zona: solo acertarán los que pertenecen a ella.
    for (const node of pbq.nodes) {
      fireEvent.change(screen.getByLabelText(`Zona de ${node.label}`), {
        target: { value: 'interna' },
      });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    await settleUntil(() => screen.queryByText(/No superada/) !== null);

    expect(screen.getByRole('heading', { name: 'Activos mal colocados' })).toBeInTheDocument();
    expect(screen.getByText(/Servidor web público/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Por qué' })).toBeInTheDocument();
  });

  it('avisa si la simulación no existe', async () => {
    setPbqRepository(createMemoryPbqRepository());

    renderPbq('no-existe');
    await settleUntil(() => screen.queryByRole('alert') !== null);

    expect(screen.getByRole('alert')).toHaveTextContent(/no existe/i);
  });
});
