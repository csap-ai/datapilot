import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { backend, isDesktop } from '@/lib/backend';

interface Props {
  connectionId: string;
  defaultSchema?: string;
  defaultTable?: string;
  onClose: () => void;
  onImported?: (rowCount: number) => void;
}

export function CSVImportDialog({ connectionId, defaultSchema = '', defaultTable = '', onClose, onImported }: Props) {
  const [schema, setSchema] = useState(defaultSchema);
  const [table, setTable] = useState(defaultTable);
  const [csv, setCsv] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.onerror = () => toast.error('读取文件失败');
    reader.readAsText(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDesktop()) { toast.error('仅在桌面版可用'); return; }
    if (!table.trim()) { toast.error('请输入目标表名'); return; }
    if (!csv.trim()) { toast.error('CSV 内容为空'); return; }

    setRunning(true);
    try {
      const r = await backend.importCSV(connectionId, schema.trim(), table.trim(), csv, hasHeader);
      if (r.error) {
        toast.warning(`已导入 ${r.rowsImported} 行后中止: ${r.error}`);
      } else {
        toast.success(`成功导入 ${r.rowsImported} 行`);
      }
      onImported?.(r.rowsImported);
      onClose();
    } catch (err: unknown) {
      toast.error(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-dp-border px-5 py-3">
            <p className="text-[0.92rem] font-bold">导入 CSV</p>
            <button type="button" className="text-dp-text-dimmed hover:text-dp-text-secondary" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  Schema（可选）
                </label>
                <input
                  className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] focus:border-dp-border-accent focus:outline-none"
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  目标表 *
                </label>
                <input
                  className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] focus:border-dp-border-accent focus:outline-none"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[0.8rem] text-dp-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              首行为列名
            </label>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  CSV 内容
                </label>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded border border-dp-border px-2 py-1 text-[0.72rem] text-dp-text-dimmed hover:border-dp-border-accent hover:text-dp-text-secondary"
                  onClick={pickFile}
                >
                  <Upload size={11} />
                  选择文件
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
              </div>
              <textarea
                className="h-40 w-full resize-none rounded-md border border-dp-border bg-dp-surface px-2.5 py-2 font-mono text-[0.74rem] placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                placeholder="name,age&#10;Alice,30&#10;Bob,25"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
            <button
              type="button"
              className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-dp-border-accent bg-dp-accent/20 px-4 py-2 text-[0.82rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              disabled={running || !table.trim() || !csv.trim()}
            >
              {running && <Loader2 size={12} className="animate-spin" />}
              导入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
