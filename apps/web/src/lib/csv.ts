/** CSV + download helpers reused by evidence pack and filter-driven exports. */

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: readonly string[],
): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  if (cols.length === 0) return "";
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s =
      Array.isArray(v)
        ? v.join("; ")
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}
