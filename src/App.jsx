import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Download,
  Circle,
  Square,
  RotateCcw,
} from 'lucide-react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import Canvas3D from './components/Canvas3D.jsx';
import DHTable from './components/DHTable.jsx';
import MatrixDisplay from './components/MatrixDisplay.jsx';
import ExplainFrame from './components/ExplainFrame.jsx';
import { DHKinematics, DHRow } from './lib/dhKinematics.js';
import { getPreset, PRESETS } from './lib/presets.js';
import { dhToURDF } from './lib/urdfExport.js';

const PRESET_IDS = Object.keys(PRESETS);

function App() {
  const [rows, setRows] = useState(() => getPreset('Custom (6R)').rows);
  const [convention, setConvention] = useState('standard');
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [hoverCell, setHoverCell] = useState(null);
  const [showGhost, setShowGhost] = useState(true);
  const [showJointLabels, setShowJointLabels] = useState(true);
  const [recording, setRecording] = useState(false);
  const [tracePoints, setTracePoints] = useState([]);
  const prevThetasRef = useRef(rows.map((r) => r.theta));
  const [ghostThetas, setGhostThetas] = useState(null);

  // Update ghost thetas when joint angles change (one step behind)
  useEffect(() => {
    const current = rows.map((r) => r.theta);
    setGhostThetas(prevThetasRef.current.slice());
    prevThetasRef.current = current;
  }, [rows]);

  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(rows);
    return e;
  }, [convention, rows]);

  const breakdown = selectedRowIndex >= 0 && selectedRowIndex < rows.length
    ? engine.getTransformBreakdown(selectedRowIndex)
    : null;
  const explainText = selectedRowIndex >= 0 && selectedRowIndex < rows.length
    ? engine.explainFrame(selectedRowIndex)
    : '';

  const handleUpdateRow = (rowIndex, key, value) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        const v = value === '' ? 0 : Number(value);
        if (key === 'a') return new DHRow(r.i, v, r.alpha, r.d, r.theta);
        if (key === 'alpha') return new DHRow(r.i, r.a, v, r.d, r.theta);
        if (key === 'd') return new DHRow(r.i, r.a, r.alpha, v, r.theta);
        if (key === 'theta') return new DHRow(r.i, r.a, r.alpha, r.d, v);
        return r;
      })
    );
  };

  const handlePresetSelect = (id) => {
    const preset = getPreset(id);
    if (preset) {
      setRows(preset.rows);
      setConvention(preset.convention);
      setTracePoints([]);
    }
  };

  const handleRecordPoint = (point) => {
    setTracePoints((prev) => [...prev.slice(-2499), { ...point }]);
  };

  const exportURDF = () => {
    const xml = dhToURDF(rows, 'fk_lab_robot');
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robot.urdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          Interactive FK Pedagogical Laboratory
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)]">Convention</span>
            <Tabs.Root value={convention} onValueChange={setConvention}>
              <Tabs.List className="flex rounded-md border border-[var(--border)] p-0.5 bg-[var(--panel)]">
                <Tabs.Trigger
                  value="standard"
                  className="px-3 py-1.5 text-xs rounded data-[state=active]:bg-[var(--accent)] data-[state=active]:text-black"
                >
                  Standard DH
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="modified"
                  className="px-3 py-1.5 text-xs rounded data-[state=active]:bg-[var(--accent)] data-[state=active]:text-black"
                >
                  Modified DH
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </div>
          <div className="flex items-center gap-2">
            <Switch.Root
              checked={showGhost}
              onCheckedChange={setShowGhost}
              className="w-9 h-5 rounded-full bg-[var(--border)] data-[state=checked]:bg-[var(--accent)] relative"
            >
              <Switch.Thumb className="block w-4 h-4 rounded-full bg-white translate-x-0.5 data-[state=checked]:translate-x-4 transition-transform" />
            </Switch.Root>
            <span className="text-sm text-[var(--muted)]">Ghost</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch.Root
              checked={showJointLabels}
              onCheckedChange={setShowJointLabels}
              className="w-9 h-5 rounded-full bg-[var(--border)] data-[state=checked]:bg-[var(--accent)] relative"
            >
              <Switch.Thumb className="block w-4 h-4 rounded-full bg-white translate-x-0.5 data-[state=checked]:translate-x-4 transition-transform" />
            </Switch.Root>
            <span className="text-sm text-[var(--muted)]">Labels</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRecording((r) => !r)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border ${
                recording ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-[var(--border)]'
              }`}
            >
              {recording ? <Square className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              {recording ? 'Stop' : 'Record'} trace
            </button>
            {tracePoints.length > 0 && (
              <button
                type="button"
                onClick={() => setTracePoints([])}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-sm hover:bg-[var(--border)]">
                Presets <ChevronDown className="w-4 h-4" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 shadow-lg"
                sideOffset={6}
              >
                {PRESET_IDS.map((id) => (
                  <Dropdown.Item
                    key={id}
                    onSelect={() => handlePresetSelect(id)}
                    className="px-3 py-2 text-sm rounded outline-none cursor-pointer hover:bg-[var(--accent)]/20"
                  >
                    {id}
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
          <button
            type="button"
            onClick={exportURDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-sm hover:bg-[var(--border)]"
          >
            <Download className="w-4 h-4" /> Export URDF
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-4 p-4 overflow-hidden">
        <div className="min-h-0 flex flex-col">
          <Canvas3D
            rows={rows}
            convention={convention}
            hoverCell={hoverCell}
            ghostThetas={ghostThetas}
            showGhost={showGhost}
            showJointLabels={showJointLabels}
            tracePoints={tracePoints}
            recording={recording}
            onRecordPoint={handleRecordPoint}
          />
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-sm font-medium text-[var(--muted)] mb-2">DH Table</h2>
            <DHTable
              rows={rows}
              selectedRowIndex={selectedRowIndex}
              hoverCell={hoverCell}
              onSelectRow={setSelectedRowIndex}
              onHoverCell={setHoverCell}
              onUpdateRow={handleUpdateRow}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[var(--muted)] mb-2">Transformation matrix</h2>
            <MatrixDisplay breakdown={breakdown} selectedRowIndex={selectedRowIndex} />
          </div>
          <ExplainFrame
            explainText={explainText}
            selectedRowIndex={selectedRowIndex}
            disabled={selectedRowIndex < 0}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
