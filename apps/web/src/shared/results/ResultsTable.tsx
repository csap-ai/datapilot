import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportRowsAsCSV, exportRowsAsJSON } from '@/lib/exporters';

interface Props {
  columns: string[];
  rows: string[][];
  durationMs?: number;
  pageSize?: number;
}

type Row = Record<string, string>;

export function ResultsTable({ columns, rows, durationMs, pageSize = 100 }: Props) {
  const [pageIndex, setPageIndex] = useState(0);

  const data = useMemo<Row[]>(
    () => rows.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i] ?? '']))),
    [columns, rows],
  );

  const colDefs = useMemo<ColumnDef<Row>[]>(
    () =>
      columns.map((col) => ({
        id: col,
        accessorKey: col,
        header: col,
        size: 140,
        minSize: 60,
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: colDefs,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
    },
    manualPagination: false,
  });

  const pageCount = table.getPageCount();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-dp-border-subtle px-4 py-2.5">
        <div>
          <span className="text-[0.86rem] font-bold">查询结果</span>
          <span className="ml-3 text-[0.78rem] text-dp-text-muted">
            {rows.length.toLocaleString()} 行
            {durationMs !== undefined && ` · ${durationMs} ms`}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            className="flex items-center gap-1.5 rounded-md border border-dp-border bg-dp-surface-solid px-2.5 py-1.5 text-[0.76rem] font-semibold text-dp-text-secondary hover:border-dp-border-accent hover:text-dp-text disabled:opacity-40"
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportRowsAsCSV(columns, rows, `result_${Date.now()}.csv`)}
          >
            <Download size={12} />
            CSV
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md border border-dp-border bg-dp-surface-solid px-2.5 py-1.5 text-[0.76rem] font-semibold text-dp-text-secondary hover:border-dp-border-accent hover:text-dp-text disabled:opacity-40"
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportRowsAsJSON(columns, rows, `result_${Date.now()}.json`)}
          >
            <Download size={12} />
            JSON
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[0.84rem]">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-dp-border-subtle bg-dp-surface-solid px-3.5 py-[10px] text-left text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-blue"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'group transition-colors',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-dp-surface-raised/30',
                  'hover:bg-dp-accent-hover/30',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-dp-border-subtle px-3.5 py-[9px] whitespace-nowrap text-dp-text-secondary"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-dp-border-subtle px-4 py-2">
          <span className="text-[0.76rem] text-dp-text-dimmed">
            第 {pageIndex + 1} / {pageCount} 页
          </span>
          <div className="flex gap-1">
            <button
              className="rounded p-1 text-dp-text-muted hover:text-dp-text disabled:opacity-30"
              disabled={!table.getCanPreviousPage()}
              type="button"
              onClick={() => setPageIndex((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="rounded p-1 text-dp-text-muted hover:text-dp-text disabled:opacity-30"
              disabled={!table.getCanNextPage()}
              type="button"
              onClick={() => setPageIndex((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
