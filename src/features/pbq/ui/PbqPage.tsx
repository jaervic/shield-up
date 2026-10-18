import { Suspense, lazy, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { PbqAttempt, TopologyPlacement, TranscriptEntry } from '@/domain/pbq';
import { isTopologyPbq } from '@/domain/pbq';
import { Button } from '@/shared/ui/Button';
import {
  countPlaced,
  emptyPlacement,
  isPlacementComplete,
  placeNode,
} from '../engine/topology';
import { getPbqById, submitTerminal, submitTopology } from '../data/pbqService';
import { pbqCatalogQueryKey } from '../state/usePbq';
import { PbqResults } from './PbqResults';
import { TopologyBoard } from './TopologyBoard';
import styles from './PbqPage.module.css';

/**
 * xterm.js pesa y solo hace falta en las PBQ de terminal, así que se carga de
 * forma diferida: no entra en el bundle inicial ni en las rutas de topología.
 */
const TerminalSession = lazy(() =>
  import('./TerminalSession').then((module) => ({ default: module.TerminalSession })),
);

type Status = 'solving' | 'submitting' | 'done';

/** Resuelve una PBQ: el tablero o la terminal, según la familia. */
export function PbqPage() {
  const { pbqId } = useParams<{ pbqId: string }>();
  const queryClient = useQueryClient();
  const pbq = pbqId === undefined ? undefined : getPbqById(pbqId);

  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [status, setStatus] = useState<Status>('solving');
  const [attempt, setAttempt] = useState<PbqAttempt | null>(null);
  const [placement, setPlacement] = useState<TopologyPlacement>({});
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de PBQ se empieza de cero. La dependencia es el ID, no el
  // objeto: aunque el contenido esté cacheado, un objeto nuevo dispararía el
  // efecto en cada render.
  useEffect(() => {
    const current = pbqId === undefined ? undefined : getPbqById(pbqId);
    setStartedAt(new Date().toISOString());
    setStatus('solving');
    setAttempt(null);
    setTranscript([]);
    setError(null);
    setPlacement(current !== undefined && isTopologyPbq(current) ? emptyPlacement(current) : {});
  }, [pbqId]);

  if (pbq === undefined) {
    return <p role="alert">No existe esa simulación.</p>;
  }

  const isTopology = isTopologyPbq(pbq);
  const complete = isTopology ? isPlacementComplete(pbq, placement) : transcript.length > 0;

  async function handleSubmit() {
    if (pbq === undefined) return;
    setStatus('submitting');
    setError(null);

    try {
      const result = isTopologyPbq(pbq)
        ? await submitTopology(pbq, placement, startedAt)
        : await submitTerminal(pbq, transcript, startedAt);

      setAttempt(result);
      setStatus('done');
      await queryClient.invalidateQueries({ queryKey: pbqCatalogQueryKey });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo corregir la simulación.');
      setStatus('solving');
    }
  }

  function handleRetry() {
    setStartedAt(new Date().toISOString());
    setAttempt(null);
    setStatus('solving');
    setTranscript([]);
    setPlacement(pbq !== undefined && isTopologyPbq(pbq) ? emptyPlacement(pbq) : {});
  }

  if (status === 'done' && attempt !== null) {
    return <PbqResults pbq={pbq} attempt={attempt} onRetry={handleRetry} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.meta}>
          {isTopology ? 'Topología' : 'Terminal'} · ~{pbq.estimatedMinutes} min
          {isTopology ? ` · ${countPlaced(pbq, placement)}/${pbq.nodes.length} colocados` : ''}
        </p>
        <h1 className={styles.title}>{pbq.title}</h1>
        <p className={styles.instructions}>{pbq.instructions}</p>
      </header>

      {isTopologyPbq(pbq) ? (
        <TopologyBoard
          pbq={pbq}
          placement={placement}
          disabled={status === 'submitting'}
          onPlace={(nodeId, zoneId) =>
            setPlacement((current) => placeNode(current, nodeId, zoneId))
          }
        />
      ) : (
        <Suspense
          fallback={
            <p className={styles.pending} role="status">
              Cargando la terminal…
            </p>
          }
        >
          <TerminalSession
            pbq={pbq}
            disabled={status === 'submitting'}
            onTranscriptChange={setTranscript}
          />
        </Suspense>
      )}

      {error !== null ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button
          variant="primary"
          disabled={!complete || status === 'submitting'}
          onClick={() => void handleSubmit()}
        >
          {status === 'submitting' ? 'Corrigiendo…' : 'Comprobar'}
        </Button>
        {!complete ? (
          <p className={styles.pending}>
            {isTopology
              ? 'Coloca todos los activos para poder comprobar.'
              : 'Ejecuta al menos un comando para poder comprobar.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
