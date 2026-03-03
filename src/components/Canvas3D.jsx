import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Scene } from './Scene.jsx';

export default function Canvas3D({
  rows,
  convention,
  hoverCell,
  ghostThetas,
  showGhost,
  tracePoints,
  recording,
  onRecordPoint,
}) {
  return (
    <div className="w-full h-full min-h-[480px] bg-[#0a0c10] rounded-lg overflow-hidden border border-[var(--border)]">
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
          tracePoints={tracePoints}
          recording={recording}
          onRecordPoint={onRecordPoint}
        />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}
