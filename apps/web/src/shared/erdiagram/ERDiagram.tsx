import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Key } from 'lucide-react';
import { backend, isDesktop, type GraphTable, type SchemaGraph } from '@/lib/backend';
import { cn } from '@/lib/utils';

interface Props {
  connectionId: string;
}

type TableNodeData = { table: GraphTable };

export function ERDiagram({ connectionId }: Props) {
  const [graph, setGraph] = useState<SchemaGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    setLoading(true);
    setError(null);
    backend.getSchemaGraph(connectionId)
      .then(setGraph)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [connectionId]);

  const { nodes, edges } = useMemo(() => buildGraph(graph), [graph]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-dp-text-dimmed" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-[0.84rem] text-dp-error">{error}</p>
      </div>
    );
  }

  if (!graph || graph.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-[0.84rem] text-dp-text-dimmed">没有可显示的表</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-dp-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={20} color="oklch(0.32 0.02 260 / 0.4)" />
        <Controls
          position="bottom-left"
          showInteractive={false}
          style={{ background: 'oklch(0.16 0.02 260)', border: '1px solid oklch(0.28 0.02 260)' }}
        />
        <MiniMap
          position="bottom-right"
          maskColor="oklch(0.06 0.02 260 / 0.7)"
          style={{ background: 'oklch(0.12 0.02 260)', border: '1px solid oklch(0.28 0.02 260)' }}
          nodeColor="oklch(0.55 0.18 260)"
        />
      </ReactFlow>
    </div>
  );
}

function TableNode({ data }: NodeProps<Node<TableNodeData>>) {
  const t = data.table;
  return (
    <div className="min-w-[220px] rounded-lg border border-dp-border-accent bg-dp-surface-raised shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-dp-accent" />
      <Handle type="source" position={Position.Right} className="!bg-dp-accent" />
      <div className="rounded-t-lg border-b border-dp-border-accent bg-dp-accent/20 px-3 py-1.5">
        <p className="font-mono text-[0.86rem] font-bold text-dp-text-primary">
          {t.schema && <span className="text-dp-text-dimmed">{t.schema}.</span>}
          {t.name}
        </p>
      </div>
      <div className="flex flex-col">
        {t.columns.map((c) => (
          <div
            key={c.name}
            className={cn(
              'flex items-center gap-1.5 px-3 py-0.5 text-[0.74rem] font-mono',
              c.primaryKey ? 'text-dp-warning' : 'text-dp-text-secondary',
            )}
          >
            {c.primaryKey && <Key size={9} className="shrink-0" />}
            <span className="flex-1 truncate">{c.name}</span>
            <span className="shrink-0 text-[0.68rem] text-dp-text-dimmed">{c.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NODE_TYPES = { table: TableNode };

function buildGraph(graph: SchemaGraph | null): { nodes: Node[]; edges: Edge[] } {
  if (!graph) return { nodes: [], edges: [] };

  const cols = Math.max(1, Math.ceil(Math.sqrt(graph.tables.length)));
  const colWidth = 320;
  const rowHeight = 240;

  const nodes: Node[] = graph.tables.map((t, i) => ({
    id: keyFor(t.schema, t.name),
    type: 'table',
    position: { x: (i % cols) * colWidth, y: Math.floor(i / cols) * rowHeight },
    data: { table: t },
  }));

  const edges: Edge[] = graph.foreignKeys.map((fk, i) => ({
    id: `fk-${i}`,
    source: keyFor(fk.from.schema, fk.from.table),
    target: keyFor(fk.to.schema, fk.to.table),
    label: `${fk.from.columns.join(',')} → ${fk.to.columns.join(',')}`,
    type: 'smoothstep',
    animated: false,
    style: { stroke: 'oklch(0.55 0.18 260)', strokeWidth: 1.5 },
    labelStyle: { fill: 'oklch(0.78 0.04 260)', fontSize: 10 },
    labelBgStyle: { fill: 'oklch(0.16 0.02 260)' },
  }));

  return { nodes, edges };
}

function keyFor(schema: string, table: string): string {
  return schema ? `${schema}.${table}` : table;
}
