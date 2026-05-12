function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function exportRowsAsCSV(columns: string[], rows: string[][], filename = 'result.csv') {
  const lines: string[] = [];
  lines.push(columns.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(row.map((v) => csvEscape(v ?? '')).join(','));
  }
  download(filename, lines.join('\n'), 'text/csv;charset=utf-8');
}

export function exportRowsAsJSON(columns: string[], rows: string[][], filename = 'result.json') {
  const out = rows.map((row) => {
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => { obj[col] = row[i] ?? ''; });
    return obj;
  });
  download(filename, JSON.stringify(out, null, 2), 'application/json');
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  download(filename, content, mime);
}
