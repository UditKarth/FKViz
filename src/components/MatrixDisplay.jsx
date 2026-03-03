import { useMemo } from 'react';

export default function MatrixDisplay({ breakdown, selectedRowIndex }) {
  const matrix = useMemo(() => {
    if (!breakdown?.elements) return null;
    const e = breakdown.elements;
    return [
      [e[0], e[4], e[8], e[12]],
      [e[1], e[5], e[9], e[13]],
      [e[2], e[6], e[10], e[14]],
      [e[3], e[7], e[11], e[15]],
    ];
  }, [breakdown]);

  if (selectedRowIndex == null || selectedRowIndex < 0 || !matrix) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Select a row to view <sup>i-1</sup>T<sub>i</sub>
      </div>
    );
  }

  const num = breakdown?.terms?.numeric;
  const fmt = (v) => (typeof v === 'number' ? v.toFixed(4) : String(v));

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="text-xs font-medium text-[var(--muted)] mb-2">
        <sup>{selectedRowIndex}</sup>T<sub>{selectedRowIndex + 1}</sub> (row {selectedRowIndex + 1})
      </div>
      <div className="font-mono text-[13px] space-y-1">
        {matrix.map((row, i) => (
          <div key={i} className="flex gap-2 justify-between">
            <span className="text-[var(--muted)] w-4">{i}</span>
            <span className="flex gap-3">
              {row.map((v, j) => (
                <span key={j} className="w-16 text-right tabular-nums">
                  {fmt(v)}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {num && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          sin/cos terms: θ → [{fmt(num.r11)}, {fmt(num.r12)}, …] α → [{fmt(num.r33)}, …]
        </div>
      )}
    </div>
  );
}
