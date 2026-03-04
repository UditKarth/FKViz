import * as Label from '@radix-ui/react-label';
import { cn } from '../lib/utils.js';

const COLS = [
  { key: 'i', label: 'Link (i)', unit: '', readOnly: true },
  { key: 'a', label: 'aᵢ', unit: 'm', title: 'Link length' },
  { key: 'alpha', label: 'αᵢ', unit: '°', title: 'Link twist' },
  { key: 'd', label: 'dᵢ', unit: 'm', title: 'Joint offset' },
  { key: 'theta', label: 'θᵢ', unit: '°', title: 'Joint angle' },
];

export default function DHTable({
  rows,
  selectedRowIndex,
  hoverCell,
  onSelectRow,
  onHoverCell,
  onUpdateRow,
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              {COLS.map(({ key, label, title }) => (
                <th
                  key={key}
                  className="px-3 py-2 text-left font-medium text-[var(--muted)]"
                  title={title}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={cn(
                  'border-b border-[var(--border)] transition-colors',
                  selectedRowIndex === ri && 'bg-[var(--accent)]/10'
                )}
                onClick={() => onSelectRow(ri)}
              >
                {COLS.map(({ key, label, unit, readOnly }) => {
                  const cellId = `${key}-${ri}`;
                  const isHovered = hoverCell?.row === ri && hoverCell?.col === key;
                  return (
                    <td
                      key={key}
                      className={cn(
                        'px-2 py-1',
                        !readOnly && 'table-cell-hover',
                        isHovered && 'table-cell-highlight'
                      )}
                      onMouseEnter={() => onHoverCell({ row: ri, col: key })}
                      onMouseLeave={() => onHoverCell(null)}
                    >
                      {readOnly ? (
                        <span className="font-mono">{row.i}</span>
                      ) : (
                        <>
                          <Label.Root className="sr-only" htmlFor={cellId}>
                            {label}
                          </Label.Root>
                          <input
                            id={cellId}
                            type="number"
                            step={key === 'a' || key === 'd' ? 0.01 : 1}
                            value={row[key]}
                            onChange={(e) =>
                              onUpdateRow(ri, key, e.target.value === '' ? '' : Number(e.target.value))
                            }
                            className="w-16 min-w-0 text-center text-[13px] bg-[var(--bg)] border border-[var(--border)] rounded-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                            aria-label={label}
                          />
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
