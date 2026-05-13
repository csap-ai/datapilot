import { ChevronRight, GitMerge } from 'lucide-react';
import type { ExplainNode, ExplainResult } from '@/lib/backend';

interface Props {
  result: ExplainResult;
}

export function ExplainView({ result }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-dp-border-subtle px-4 py-2 flex items-center gap-2">
        <GitMerge size={13} className="text-dp-accent" />
        <p className="text-[0.86rem] font-bold">执行计划</p>
        <span className="text-[0.74rem] text-dp-text-dimmed">{nodeCount(result.nodes)} 节点</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {result.nodes.length === 0 ? (
          <pre className="whitespace-pre-wrap font-mono text-[0.78rem] text-dp-text-secondary">
            {result.raw || '(空)'}
          </pre>
        ) : (
          <div className="flex flex-col gap-1">
            {result.nodes.map((n, i) => <PlanNode key={i} node={n} depth={0} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanNode({ node, depth }: { node: ExplainNode; depth: number }) {
  return (
    <div>
      <div
        className="flex items-baseline gap-2 rounded px-2 py-1.5 hover:bg-dp-surface-raised"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        {node.children && node.children.length > 0
          ? <ChevronRight size={11} className="shrink-0 mt-0.5 rotate-90 text-dp-text-dimmed" />
          : <span className="w-[11px] shrink-0" />
        }
        <span className="font-mono text-[0.82rem] font-bold text-dp-accent-light">{node.op}</span>
        {node.details && <span className="font-mono text-[0.76rem] text-dp-text-secondary truncate">{node.details}</span>}
      </div>
      {node.children?.map((c, i) => <PlanNode key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

function nodeCount(nodes: ExplainNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + nodeCount(node.children ?? []);
  }
  return n;
}
