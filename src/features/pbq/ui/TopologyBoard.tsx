import { useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { TopologyNode, TopologyPbq, TopologyPlacement, TopologyZone } from '@/domain/pbq';
import styles from './TopologyBoard.module.css';

const POOL_ID = 'pool';

export interface TopologyBoardProps {
  pbq: TopologyPbq;
  placement: TopologyPlacement;
  onPlace: (nodeId: string, zoneId: string | null) => void;
  disabled?: boolean;
}

function NodeCard({
  node,
  pbq,
  zoneId,
  disabled,
  onPlace,
}: {
  node: TopologyNode;
  pbq: TopologyPbq;
  zoneId: string | null;
  disabled: boolean;
  onPlace: (nodeId: string, zoneId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node.id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={isDragging ? styles.nodeDragging : styles.node}
      {...attributes}
      {...listeners}
    >
      <span className={styles.nodeLabel}>{node.label}</span>
      {node.hint !== undefined ? <span className={styles.nodeHint}>{node.hint}</span> : null}

      {/* Alternativa accesible al arrastre: un `select` nativo funciona con
          teclado y con lector de pantalla sin nada extra. */}
      <label className={styles.nodeControl}>
        <span className="visually-hidden">Zona de {node.label}</span>
        <select
          className={styles.select}
          value={zoneId ?? ''}
          disabled={disabled}
          onChange={(event) => onPlace(node.id, event.target.value === '' ? null : event.target.value)}
        >
          <option value="">Sin colocar</option>
          {pbq.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}

function ZoneColumn({
  zone,
  pbq,
  placement,
  disabled,
  onPlace,
}: {
  zone: TopologyZone;
  pbq: TopologyPbq;
  placement: TopologyPlacement;
  disabled: boolean;
  onPlace: (nodeId: string, zoneId: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id, disabled });
  const nodes = pbq.nodes.filter((node) => placement[node.id] === zone.id);

  return (
    <div
      ref={setNodeRef}
      className={isOver ? styles.zoneOver : styles.zone}
      style={{ borderTopColor: `var(--domain-${pbq.domain})` }}
    >
      <h3 className={styles.zoneTitle}>{zone.label}</h3>
      {zone.description !== undefined ? (
        <p className={styles.zoneDescription}>{zone.description}</p>
      ) : null}

      {nodes.length === 0 ? (
        <p className={styles.zoneEmpty}>Arrastra un activo aquí</p>
      ) : (
        <ul className={styles.nodeList} role="list">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              pbq={pbq}
              zoneId={zone.id}
              disabled={disabled}
              onPlace={onPlace}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Tablero de topología.
 *
 * Se puede arrastrar (dnd-kit, ratón y táctil) y también elegir la zona en un
 * `select` por activo: el arrastre es la vía rápida, el select es la vía
 * accesible, y ambos escriben el mismo estado.
 */
export function TopologyBoard({ pbq, placement, onPlace, disabled = false }: TopologyBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const unplaced = useMemo(
    () => pbq.nodes.filter((node) => (placement[node.id] ?? null) === null),
    [pbq.nodes, placement],
  );

  const { setNodeRef: setPoolRef, isOver: isOverPool } = useDroppable({
    id: POOL_ID,
    disabled,
  });

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (overId === undefined) return;
    onPlace(String(event.active.id), overId === POOL_ID ? null : String(overId));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={styles.board}>
        <div
          ref={setPoolRef}
          className={isOverPool ? styles.poolOver : styles.pool}
          aria-label="Activos sin colocar"
        >
          <h3 className={styles.zoneTitle}>Sin colocar</h3>
          {unplaced.length === 0 ? (
            <p className={styles.zoneEmpty}>Todos los activos están colocados</p>
          ) : (
            <ul className={styles.nodeList} role="list">
              {unplaced.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  pbq={pbq}
                  zoneId={null}
                  disabled={disabled}
                  onPlace={onPlace}
                />
              ))}
            </ul>
          )}
        </div>

        <div className={styles.zones}>
          {pbq.zones.map((zone) => (
            <ZoneColumn
              key={zone.id}
              zone={zone}
              pbq={pbq}
              placement={placement}
              disabled={disabled}
              onPlace={onPlace}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
