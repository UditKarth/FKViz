import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function ExplainFrame({ explainText, selectedRowIndex, disabled }) {
  const [open, setOpen] = useState(false);
  const text = explainText || (selectedRowIndex >= 0 ? 'Select a row and click "Explain This Frame".' : 'Select a row from the DH table first.');

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-50"
      >
        <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
        Explain This Frame
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0 text-[13px] text-[var(--muted)] border-t border-[var(--border)]">
          {text}
        </div>
      )}
    </div>
  );
}
