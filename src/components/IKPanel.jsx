import { useState } from 'react';
import * as Label from '@radix-ui/react-label';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronRight, Target, Play, Check } from 'lucide-react';
import { solveIK, IK_METHODS } from '../lib/ikSolvers.js';
import { cn } from '../lib/utils.js';

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 0.0001;

export default function IKPanel({
  rows,
  convention,
  currentEEPosition,
  ikTarget,
  onTargetChange,
  ikResult,
  onSolve,
  onApply,
  onUseCurrentEE,
  showPreview = false,
  onShowPreviewChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [solverId, setSolverId] = useState('dls');
  const [maxIterations, setMaxIterations] = useState(DEFAULT_MAX_ITERATIONS);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);

  const hasTarget = ikTarget != null;
  const target = ikTarget ?? { x: 0, y: 0, z: 0 };
  const canSolve = hasTarget && rows.length > 0;
  const canApply = ikResult?.success && Array.isArray(ikResult.thetas) && ikResult.thetas.length === rows.length;

  const handleSolve = () => {
    if (!canSolve) return;
    onSolve({
      method: solverId,
      target: { ...target },
      options: { maxIterations, positionTolerance: tolerance },
    });
  };

  const handleApply = () => {
    if (!canApply) return;
    onApply(ikResult.thetas);
  };

  const handleUseCurrentEE = () => {
    if (currentEEPosition) onUseCurrentEE(currentEEPosition);
  };

  const reasonLabel = {
    converged: 'Converged',
    max_iterations: 'Max iterations reached',
    singular: 'Singular (near singularity)',
    unreachable: 'Unreachable',
    unknown_method: 'Unknown method',
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
      <details open={isOpen} onToggle={(e) => setIsOpen(e.target.open)}>
        <summary className="list-none">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--border)]/50 cursor-pointer"
            onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Target className="w-4 h-4" />
            IK Solver
          </button>
        </summary>
        <div className="px-3 pb-3 pt-0 border-t border-[var(--border)] space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-xs text-[var(--muted)]">Target position (x, y, z)</span>
              <button
                type="button"
                onClick={handleUseCurrentEE}
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--border)]/50"
              >
                Use current EE
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {['x', 'y', 'z'].map((axis) => (
                <div key={axis}>
                  <Label.Root className="sr-only" htmlFor={`ik-target-${axis}`}>{axis}</Label.Root>
                  <input
                    id={`ik-target-${axis}`}
                    type="number"
                    step="0.01"
                    value={target[axis] ?? 0}
                    onChange={(e) => onTargetChange({ ...target, [axis]: Number(e.target.value) || 0 })}
                    className="w-full text-center text-[13px] bg-[var(--bg)] border border-[var(--border)] rounded-sm py-1 focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label.Root className="text-xs text-[var(--muted)]">Solver</Label.Root>
            <Select.Root value={solverId} onValueChange={setSolverId}>
              <Select.Trigger
                className="mt-1 flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:border-[var(--accent)]"
                aria-label="IK solver"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="w-4 h-4" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 shadow-lg"
                  position="popper"
                  sideOffset={4}
                >
                  {IK_METHODS.map((m) => (
                    <Select.Item
                      key={m.id}
                      value={m.id}
                      className="px-3 py-2 text-sm rounded outline-none cursor-pointer hover:bg-[var(--accent)]/20 data-[highlighted]:bg-[var(--accent)]/20"
                    >
                      {m.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label.Root htmlFor="ik-max-iter" className="text-xs text-[var(--muted)]">Max iterations</Label.Root>
              <input
                id="ik-max-iter"
                type="number"
                min={1}
                max={1000}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value) || 100)}
                className="w-full mt-0.5 text-center text-[13px] bg-[var(--bg)] border border-[var(--border)] rounded-sm py-1 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <Label.Root htmlFor="ik-tol" className="text-xs text-[var(--muted)]">Tolerance</Label.Root>
              <input
                id="ik-tol"
                type="number"
                step="0.0001"
                min={1e-6}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value) || 1e-4)}
                className="w-full mt-0.5 text-center text-[13px] bg-[var(--bg)] border border-[var(--border)] rounded-sm py-1 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSolve}
              disabled={!canSolve}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                canSolve
                  ? 'border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--accent)] hover:text-black'
                  : 'border-[var(--border)] bg-[var(--border)]/30 text-[var(--muted)] cursor-not-allowed'
              )}
            >
              <Play className="w-4 h-4" /> Solve
            </button>
            {canApply && (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--accent)] text-black text-sm hover:opacity-90"
              >
                <Check className="w-4 h-4" /> Apply to table
              </button>
            )}
          </div>

          {ikResult != null && (
            <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-xs space-y-1">
              <div className="font-medium">
                Status: {reasonLabel[ikResult.reason] ?? ikResult.reason}
              </div>
              <div className="text-[var(--muted)]">
                Iterations: {ikResult.iterations} · Final error: {ikResult.finalError?.toFixed(6) ?? '—'}
              </div>
              {Array.isArray(ikResult.thetas) && ikResult.thetas.length > 0 && (
                <div className="pt-1">
                  <span className="text-[var(--muted)]">Solution θ (°): </span>
                  <span className="font-mono">
                    {ikResult.thetas.map((t, i) => (
                      <span key={i}>{i > 0 ? ', ' : ''}{Number(t).toFixed(2)}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          {ikResult?.success && onShowPreviewChange != null && (
            <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => onShowPreviewChange(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              Show preview in 3D
            </label>
          )}
        </div>
      </details>
    </div>
  );
}

export { IK_METHODS };
