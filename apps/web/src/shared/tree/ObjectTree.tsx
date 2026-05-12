import { useEffect, useState } from 'react';
import { ChevronRight, Database, Table2, Eye, Loader2, Search, Upload, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type TreeNode } from '@/lib/backend';
import { emitLoadSQL } from '@/lib/editor-events';
import { openTab } from '@/shared/workspace';
import { CSVImportDialog } from '@/shared/import';
import { DataDiffDialog } from '@/shared/datadiff';

interface Props {
  connectionId: string;
}

export function ObjectTree({ connectionId }: Props) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [importTarget, setImportTarget] = useState<{ schema: string; table: string } | null>(null);
  const [diffTarget, setDiffTarget] = useState<{ schema: string; table: string } | null>(null);

  useEffect(() => {
    if (!connectionId || !isDesktop()) return;
    setLoading(true);
    setError(null);
    setNodes([]);
    backend
      .getObjectTree(connectionId)
      .then((tree) => setNodes(tree))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [connectionId]);

  function toggleKey(key: string) {
    setOpenKeys((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  }

  function resolveSchema(parentKind: TreeNode['kind'] | null, parentName: string): string {
    if (parentKind === 'schema') return parentName;
    if (parentKind === 'database' && parentName !== 'main') return parentName;
    return '';
  }

  function handleBrowse(schema: string, table: string) {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const sql = schema
      ? `SELECT * FROM ${q(schema)}.${q(table)} LIMIT 100;`
      : `SELECT * FROM ${q(table)} LIMIT 100;`;
    emitLoadSQL(sql);
  }

  function handleInspect(schema: string, table: string) {
    openTab({
      id: `meta-${connectionId}-${schema}-${table}`,
      label: table,
      type: 'metadata',
      meta: { connectionId, schema, table },
    });
  }

  function renderNode(
    node: TreeNode,
    depth: number,
    parentKey: string,
    parentKind: TreeNode['kind'] | null,
    parentName: string,
  ): React.ReactNode {
    const key = `${parentKey}/${node.name}`;
    const open = openKeys.has(key);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isTable = node.kind === 'table' || node.kind === 'view';
    const schema = isTable ? resolveSchema(parentKind, parentName) : '';

    return (
      <div key={key}>
        <TreeRow
          depth={depth}
          icon={<NodeIcon kind={node.kind} />}
          label={node.name}
          open={hasChildren ? open : undefined}
          hasChildren={hasChildren}
          onClick={hasChildren ? () => toggleKey(key) : undefined}
          actions={isTable ? (
            <>
              <ActionBtn title="浏览数据" onClick={() => handleBrowse(schema, node.name)}>
                <Eye size={11} />
              </ActionBtn>
              <ActionBtn title="检查结构" onClick={() => handleInspect(schema, node.name)}>
                <Search size={11} />
              </ActionBtn>
              {node.kind === 'table' && (
                <ActionBtn title="导入 CSV" onClick={() => setImportTarget({ schema, table: node.name })}>
                  <Upload size={11} />
                </ActionBtn>
              )}
              {node.kind === 'table' && (
                <ActionBtn title="数据对比" onClick={() => setDiffTarget({ schema, table: node.name })}>
                  <GitCompare size={11} />
                </ActionBtn>
              )}
            </>
          ) : undefined}
        />
        {open && hasChildren && node.children!.map((child) => renderNode(child, depth + 1, key, node.kind, node.name))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={14} className="animate-spin text-dp-text-dimmed" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3">
        <p className="break-words text-[0.76rem] text-dp-error">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto py-1">
        {nodes.map((node) => renderNode(node, 0, '', null, ''))}
      </div>
      {importTarget && (
        <CSVImportDialog
          connectionId={connectionId}
          defaultSchema={importTarget.schema}
          defaultTable={importTarget.table}
          onClose={() => setImportTarget(null)}
        />
      )}
      {diffTarget && (
        <DataDiffDialog
          defaultSourceId={connectionId}
          defaultSchema={diffTarget.schema}
          defaultTable={diffTarget.table}
          onClose={() => setDiffTarget(null)}
        />
      )}
    </>
  );
}

function NodeIcon({ kind }: { kind: TreeNode['kind'] }) {
  switch (kind) {
    case 'database':
      return <Database size={13} className="text-dp-accent" />;
    case 'schema':
      return <span className="text-[0.64rem] font-bold text-dp-text-dimmed">S</span>;
    case 'view':
      return <Eye size={12} className="text-dp-blue" />;
    default:
      return <Table2 size={12} className="text-dp-text-dimmed" />;
  }
}

function TreeRow({
  depth,
  icon,
  label,
  open,
  hasChildren,
  onClick,
  actions,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  open?: boolean;
  hasChildren: boolean;
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="group/row relative flex items-center">
      <button
        type="button"
        className={cn(
          'flex flex-1 items-center gap-1.5 py-[5px] text-left text-[0.82rem] text-dp-text-secondary hover:bg-dp-accent-hover/40 hover:text-dp-text min-w-0',
          !onClick && 'cursor-default',
        )}
        style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: '12px' }}
        onClick={onClick}
      >
        {hasChildren ? (
          <ChevronRight
            size={12}
            className={cn('shrink-0 text-dp-text-dimmed transition-transform', open && 'rotate-90')}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      {actions && (
        <div className="absolute right-2 flex gap-0.5 opacity-0 group-hover/row:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="rounded p-1 text-dp-text-dimmed hover:bg-dp-surface-raised hover:text-dp-text-secondary"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {children}
    </button>
  );
}
