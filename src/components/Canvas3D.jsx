import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Scene } from './Scene.jsx';

export default function Canvas3D({
  rows,
  convention,
  hoverCell,
  ghostThetas,
  showGhost,
  showJointLabels = true,
  tracePoints,
  recording,
  onRecordPoint,
  onLabelPositions,
  labelScreenPositions = [],
  ikTarget = null,
  ikPreviewThetas = null,
}) {
  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#0a0c10] rounded-lg overflow-hidden border border-[var(--border)]">
      <Canvas
        camera={{ position: [0.8, 0.5, 0.8], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene
          rows={rows}
          convention={convention}
          hoverCell={hoverCell}
          ghostThetas={ghostThetas}
          showGhost={showGhost}
          showJointLabels={showJointLabels}
          tracePoints={tracePoints}
          recording={recording}
          onRecordPoint={onRecordPoint}
          onLabelPositions={onLabelPositions}
          ikTarget={ikTarget}
          ikPreviewThetas={ikPreviewThetas}
        />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
      {/* Fixed-size screen-space labels so they never scale with camera */}
      {showJointLabels && labelScreenPositions.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
        >
          {labelScreenPositions.map(({ i, x, y }) => (
            <div
              key={i}
              className="fk-label-overlay absolute font-bold text-blue-400 bg-black/70 px-0.5 rounded whitespace-nowrap"
              style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                fontSize: '10px',
              }}
            >
              Z{i}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
