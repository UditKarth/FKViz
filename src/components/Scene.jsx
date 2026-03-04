import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { DHKinematics, DHRow } from '../lib/dhKinematics.js';

const AXIS_LEN = 0.08;
const AXIS_RAD = 0.008;
const Z_LABEL_OFFSET = AXIS_LEN + 0.02;

function AxisFrame({ zLabel = 'Z', showLabel = true }) {
  return (
    <group>
      <mesh position={[AXIS_LEN / 2, 0, 0]}>
        <cylinderGeometry args={[AXIS_RAD, AXIS_RAD, AXIS_LEN, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, AXIS_LEN / 2, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[AXIS_RAD, AXIS_RAD, AXIS_LEN, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 0, AXIS_LEN / 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[AXIS_RAD, AXIS_RAD, AXIS_LEN, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Z labels are drawn in screen-space overlay (see LabelOverlay in Canvas3D) so they stay fixed size */}
    </group>
  );
}

function LinkCylinder({ length, radius = 0.02, highlight, label, showLabels }) {
  return (
    <group>
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial
          color={highlight ? '#38bdf8' : '#64748b'}
          emissive={highlight ? '#38bdf8' : '#000'}
          emissiveIntensity={highlight ? 0.4 : 0}
        />
      </mesh>
      {showLabels && label != null && (
        <Html position={[length / 2, 0.03, 0]} center distanceFactor={48} style={{ pointerEvents: 'none' }}>
          <span className="fk-label-overlay text-cyan-300 bg-black/60 px-0.5 rounded" style={{ fontSize: '8px' }}>{label}</span>
        </Html>
      )}
    </group>
  );
}

/** Dimension line for a_i: from origin along local X */
function DimensionLine({ length, highlight, showLabels }) {
  if (!highlight || length <= 0) return null;
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0)];
  return (
    <group>
      <Line points={points} color="#38bdf8" lineWidth={3} />
      {showLabels && (
        <Html position={[length / 2, 0.05, 0]} center distanceFactor={48} style={{ pointerEvents: 'none' }}>
          <span className="fk-label-overlay font-mono text-cyan-400 bg-black/80 px-0.5 rounded" style={{ fontSize: '8px' }}>a</span>
        </Html>
      )}
    </group>
  );
}

function SingleJoint({
  index,
  transform,
  linkLength,
  highlightLink,
  showAxis,
  zLabel,
}) {
  const mat = useMemo(() => {
    const m = new THREE.Matrix4();
    m.set(...transform);
    return m;
  }, [transform]);

  return (
    <group matrix={mat} matrixAutoUpdate={false}>
      {showAxis && <AxisFrame showZLabel={zLabel} />}
      <DimensionLine length={linkLength} highlight={highlightLink} />
      <LinkCylinder length={linkLength} highlight={highlightLink} label={highlightLink ? `a${index}` : null} />
    </group>
  );
}

/** One full chain: base + joints 0..n-1 as children. Each child gets T_i and draws link a_i. */
function RobotChain({
  rows,
  convention,
  hoverCell,
  ghost = false,
  opacity = 1,
}) {
  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(rows);
    return e;
  }, [rows, convention]);

  const transforms = useMemo(() => {
    const arr = [];
    let T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let i = 0; i < rows.length; i++) {
      const Ti = engine.getTransform(i);
      T = multiply4x4(T, Ti);
      arr.push({ transform: T.slice(), linkLength: rows[i].a });
    }
    return arr;
  }, [engine, rows]);

  // Nested structure: each "joint" group is positioned at 0_T_i; we render link i from frame i to i+1.
  // So we have: base (origin), then for i=0..n-1 a group at 0_T_i containing axis + dimension for a_i + cylinder for a_i.
  return (
    <group>
      {transforms.map(({ transform, linkLength }, i) => (
        <SingleJoint
          key={i}
          index={i}
          transform={transform}
          linkLength={linkLength}
          highlightLink={hoverCell?.row === i && hoverCell?.col === 'a'}
          showAxis={true}
        />
      ))}
    </group>
  );
}

function multiply4x4(A, B) {
  const out = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += A[row + k * 4] * B[k + col * 4];
      out[row + col * 4] = sum;
    }
  }
  return out;
}

/** Ghost chain: same as RobotChain but with opacity and no axis labels to reduce clutter */
function GhostChain({ rows, convention, prevRows, linkColor = '#64748b', opacity = 0.35 }) {
  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(prevRows ?? rows);
    return e;
  }, [prevRows ?? rows, convention]);

  const transforms = useMemo(() => {
    const r = prevRows ?? rows;
    const arr = [];
    let T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let i = 0; i < r.length; i++) {
      const Ti = engine.getTransform(i);
      T = multiply4x4(T, Ti);
      arr.push({ transform: T.slice(), linkLength: r[i].a });
    }
    return arr;
  }, [engine, prevRows ?? rows, rows]);

  return (
    <group>
      {transforms.map(({ transform, linkLength }, i) => (
        <GhostLink key={i} transform={transform} linkLength={linkLength} linkColor={linkColor} opacity={opacity} />
      ))}
    </group>
  );
}

function GhostLink({ transform, linkLength, linkColor = '#64748b', opacity = 0.35 }) {
  const m = useMemo(() => {
    const mat = new THREE.Matrix4();
    mat.set(...transform);
    return mat;
  }, [transform]);
  return (
    <group matrix={m} matrixAutoUpdate={false}>
      <mesh position={[linkLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, linkLength, 12]} />
        <meshBasicMaterial color={linkColor} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

/** IK target position marker in 3D */
function IKTargetMarker({ target }) {
  if (!target || typeof target.x !== 'number') return null;
  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh>
        <sphereGeometry args={[0.03, 16, 12]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.032, 12, 8]} />
        <meshBasicMaterial color="#f59e0b" wireframe />
      </mesh>
    </group>
  );
}

/** Nested FK chain: Joint_i is child of Joint_{i-1}, local matrix = i-1_T_i */
function NestedRobot({
  rows,
  convention,
  hoverCell,
  ghostThetas,
  showGhost,
  showJointLabels = true,
  jointGroupRefs,
}) {
  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(rows);
    return e;
  }, [rows, convention]);

  const prevRows = useMemo(() => {
    if (!ghostThetas || ghostThetas.length !== rows.length) return null;
    return rows.map((r, i) => ({
      ...r,
      theta: ghostThetas[i] ?? r.theta,
    }));
  }, [ghostThetas, rows]);

  return (
    <>
      {/* Ghost (onion skin) */}
      {showGhost && prevRows && (
        <GhostChain rows={rows} convention={convention} prevRows={prevRows} />
      )}
      {/* Main chain: nested groups so Joint_n is child of Joint_{n-1} */}
      <NestedChain
        rows={rows}
        convention={convention}
        engine={engine}
        hoverCell={hoverCell}
        depth={0}
        showJointLabels={showJointLabels}
        jointGroupRefs={jointGroupRefs}
      />
    </>
  );
}

function NestedChain({ rows, convention, engine, hoverCell, depth, showJointLabels = true, jointGroupRefs }) {
  if (depth >= rows.length) return null;

  const i = depth;
  const T = engine.getTransform(i);
  const linkLength = rows[i].a;
  const isLast = depth === rows.length - 1;

  const matrix = useMemo(() => {
    const m = new THREE.Matrix4();
    m.set(...T);
    return m;
  }, [T]);

  const setRef = useCallback(
    (el) => {
      if (jointGroupRefs?.current) {
        jointGroupRefs.current[i] = el;
      }
    },
    [i, jointGroupRefs]
  );

  return (
    <group ref={setRef} matrix={matrix} matrixAutoUpdate={false}>
      <AxisFrame zLabel={`Z${i}`} showLabel={showJointLabels} />
      <DimensionLine length={linkLength} highlight={hoverCell?.row === i && hoverCell?.col === 'a'} showLabels={showJointLabels} />
      <LinkCylinder
        length={linkLength}
        highlight={hoverCell?.row === i && hoverCell?.col === 'a'}
        label={hoverCell?.row === i && hoverCell?.col === 'a' ? `a${i}` : null}
        showLabels={showJointLabels}
      />
      {!isLast && (
        <NestedChain
          rows={rows}
          convention={convention}
          engine={engine}
          hoverCell={hoverCell}
          depth={depth + 1}
          showJointLabels={showJointLabels}
          jointGroupRefs={jointGroupRefs}
        />
      )}
    </group>
  );
}

function WorkspaceTrace({ points }) {
  if (!points || points.length < 2) return null;
  const vecs = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  return (
    <group>
      <Line points={vecs} color="#22c55e" lineWidth={2} />
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.008, 8, 6]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      ))}
    </group>
  );
}

const vec = new THREE.Vector3();
const labelOffsetVec = new THREE.Vector3(0, 0, Z_LABEL_OFFSET);

/** Pushes screen-space label positions using actual 3D group refs so labels match the rendered scene. */
function useLabelPositionsToOverlay(rows, showJointLabels, onLabelPositions, jointGroupRefs) {
  const { camera, size } = useThree();
  const prevRef = useRef(null);

  useFrame(() => {
    if (!onLabelPositions) return;
    if (!showJointLabels || rows.length === 0) {
      if (prevRef.current !== 'off') {
        prevRef.current = 'off';
        onLabelPositions([]);
      }
      return;
    }
    const refs = jointGroupRefs?.current;
    if (!refs) return;
    let allReady = true;
    for (let i = 0; i < rows.length; i++) {
      if (!refs[i]) {
        allReady = false;
        break;
      }
    }
    if (!allReady) return;

    const widthHalf = size.width / 2;
    const heightHalf = size.height / 2;
    const positions = [];
    for (let i = 0; i < rows.length; i++) {
      const group = refs[i];
      if (!group) continue;
      vec.copy(labelOffsetVec);
      group.localToWorld(vec);
      vec.project(camera);
      const x = vec.x * widthHalf + widthHalf;
      const y = -(vec.y * heightHalf) + heightHalf;
      positions.push({ i, x, y });
    }
    if (positions.length !== rows.length) return;
    const key = positions.map((p) => `${p.i}:${p.x.toFixed(1)}:${p.y.toFixed(1)}`).join('|');
    if (prevRef.current !== key) {
      prevRef.current = key;
      onLabelPositions(positions);
    }
  });
}

export function Scene({
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
  ikTarget = null,
  ikPreviewThetas = null,
}) {
  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(rows);
    return e;
  }, [rows, convention]);

  const jointGroupRefs = useRef([]);

  const eePose = useMemo(() => engine.getEndEffectorPose(), [engine]);
  const eePosition = useMemo(
    () => ({ x: eePose[12], y: eePose[13], z: eePose[14] }),
    [eePose]
  );

  const ikPreviewRows = useMemo(() => {
    if (!ikPreviewThetas || ikPreviewThetas.length !== rows.length) return null;
    return rows.map((r, i) => new DHRow(r.i, r.a, r.alpha, r.d, ikPreviewThetas[i]));
  }, [rows, ikPreviewThetas]);

  useLabelPositionsToOverlay(rows, showJointLabels, onLabelPositions, jointGroupRefs);

  const frameCount = useRef(0);
  useFrame(() => {
    if (recording && onRecordPoint && (frameCount.current++ % 4 === 0)) {
      onRecordPoint(eePosition);
    }
  });

  const pointsToShow = tracePoints ?? [];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <gridHelper args={[2, 20, '#1e2530', '#0f1419']} position={[0, 0, 0]} />
      <NestedRobot
        rows={rows}
        convention={convention}
        hoverCell={hoverCell}
        ghostThetas={ghostThetas}
        showGhost={showGhost}
        showJointLabels={showJointLabels}
        jointGroupRefs={jointGroupRefs}
      />
      {ikPreviewRows && (
        <GhostChain
          rows={rows}
          convention={convention}
          prevRows={ikPreviewRows}
          linkColor="#22c55e"
          opacity={0.5}
        />
      )}
      <IKTargetMarker target={ikTarget} />
      <WorkspaceTrace points={pointsToShow} />
    </>
  );
}

export function useEndEffectorPosition(rows, convention) {
  const engine = useMemo(() => {
    const e = new DHKinematics(convention);
    e.setRows(rows);
    return e;
  }, [rows, convention]);
  return useMemo(() => {
    const T = engine.getEndEffectorPose();
    return { x: T[12], y: T[13], z: T[14] };
  }, [engine]);
}
