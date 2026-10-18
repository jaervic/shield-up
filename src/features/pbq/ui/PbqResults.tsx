import { Link } from 'react-router-dom';
import type { Pbq, PbqAttempt } from '@/domain/pbq';
import { getDomain } from '@/domain/domain';
import { isTopologyPbq } from '@/domain/pbq';
import { Button } from '@/shared/ui/Button';
import styles from './PbqResults.module.css';

export interface PbqResultsProps {
  pbq: Pbq;
  attempt: PbqAttempt;
  onRetry: () => void;
}

function labelForNode(pbq: Pbq, nodeId: string): string {
  return isTopologyPbq(pbq)
    ? (pbq.nodes.find((node) => node.id === nodeId)?.label ?? nodeId)
    : nodeId;
}

function labelForZone(pbq: Pbq, zoneId: string | null): string {
  if (zoneId === null) return 'sin colocar';
  return isTopologyPbq(pbq)
    ? (pbq.zones.find((zone) => zone.id === zoneId)?.label ?? zoneId)
    : zoneId;
}

function correctZoneLabel(pbq: Pbq, nodeId: string): string {
  if (!isTopologyPbq(pbq)) return '';
  const node = pbq.nodes.find((candidate) => candidate.id === nodeId);
  return labelForZone(pbq, node?.correctZoneId ?? null);
}

export function PbqResults({ pbq, attempt, onRetry }: PbqResultsProps) {
  const missing = attempt.nodeResults?.filter((result) => !result.correct) ?? [];
  const unmet = attempt.objectiveResults?.filter((result) => !result.met) ?? [];

  return (
    <section className={styles.results} aria-labelledby="pbq-results-title">
      <div className={styles.headline}>
        <p className={attempt.passed ? styles.passed : styles.failed}>
          {attempt.passed ? 'Superada' : 'No superada'}
        </p>
        <h2 id="pbq-results-title">{pbq.title}</h2>
        <p className={styles.domain}>
          D{pbq.domain} · {getDomain(pbq.domain).nameEs}
        </p>

        <dl className={styles.scores}>
          <div>
            <dt>Resultado</dt>
            <dd>{attempt.scorePercent}%</dd>
          </div>
          {isTopologyPbq(pbq) ? (
            <div>
              <dt>Activos correctos</dt>
              <dd>
                {attempt.nodeResults?.filter((result) => result.correct).length ?? 0}/
                {attempt.nodeResults?.length ?? 0}
              </dd>
            </div>
          ) : (
            <>
              <div>
                <dt>Objetivos cumplidos</dt>
                <dd>
                  {attempt.objectiveResults?.filter((result) => result.met).length ?? 0}/
                  {attempt.objectiveResults?.length ?? 0}
                </dd>
              </div>
              <div>
                <dt>Comandos</dt>
                <dd>{attempt.commandsRun ?? 0}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {missing.length > 0 ? (
        <div className={styles.detail}>
          <h3>Activos mal colocados</h3>
          <ul role="list">
            {missing.map((result) => (
              <li key={result.nodeId}>
                <strong>{labelForNode(pbq, result.nodeId)}</strong>: lo pusiste en{' '}
                {labelForZone(pbq, result.placedZoneId)} y va en{' '}
                {correctZoneLabel(pbq, result.nodeId)}.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {unmet.length > 0 ? (
        <div className={styles.detail}>
          <h3>Objetivos sin cumplir</h3>
          <ul role="list">
            {unmet.map((result) => (
              <li key={result.objectiveId}>{result.description}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.explanation}>
        <h3>Por qué</h3>
        <p>{pbq.explanation}</p>
      </div>

      <div className={styles.actions}>
        <Link className={styles.primaryLink} to="/pbq">
          Ver todas las simulaciones
        </Link>
        <Button onClick={onRetry}>Repetir</Button>
      </div>
    </section>
  );
}
