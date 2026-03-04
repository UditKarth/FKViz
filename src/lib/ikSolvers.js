/**
 * Inverse kinematics solvers for DH chains.
 * Uses existing DHKinematics for FK; iterative solvers return convergence/failure info.
 * Supports revolute-only chains (theta as variable).
 */

import { DHKinematics, DHRow } from './dhKinematics.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const DEFAULT_OPTIONS = {
  maxIterations: 100,
  positionTolerance: 1e-4,
  damping: 0.01,
  finiteDiffDelta: 1e-6,
};

/**
 * Get end-effector position [x, y, z] from an engine (after setRows).
 */
function getEEPosition(engine) {
  const T = engine.getEndEffectorPose();
  return [T[12], T[13], T[14]];
}

/**
 * Build rows with given thetas (degrees), preserving a, alpha, d from base rows.
 */
function rowsWithThetas(baseRows, thetasDeg) {
  return baseRows.map((r, i) => new DHRow(r.i, r.a, r.alpha, r.d, thetasDeg[i]));
}

/**
 * Compute 3 x n Jacobian (position w.r.t. joint angles in radians) via finite differences.
 */
function computeJacobian(baseRows, convention, thetasRad, delta = 1e-6) {
  const n = baseRows.length;
  const engine = new DHKinematics(convention);
  const J = [];
  for (let row = 0; row < 3; row++) J.push(new Array(n));

  const thetasDeg = thetasRad.map((t) => t * RAD2DEG);
  engine.setRows(rowsWithThetas(baseRows, thetasDeg));
  const p0 = getEEPosition(engine);

  for (let col = 0; col < n; col++) {
    const thetasPlus = thetasRad.slice();
    thetasPlus[col] += delta;
    engine.setRows(rowsWithThetas(baseRows, thetasPlus.map((t) => t * RAD2DEG)));
    const pPlus = getEEPosition(engine);
    J[0][col] = (pPlus[0] - p0[0]) / delta;
    J[1][col] = (pPlus[1] - p0[1]) / delta;
    J[2][col] = (pPlus[2] - p0[2]) / delta;
  }
  return J;
}

/**
 * 3x3 matrix inverse (for J J^T + lambda^2 I).
 */
function invert3x3(A) {
  const a = A[0], b = A[1], c = A[2];
  const d = A[3], e = A[4], f = A[5];
  const g = A[6], h = A[7], i = A[8];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    (e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv,
    (f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv,
    (d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv,
  ];
}

/**
 * J (3xn), JJt (3x3) = J * J^T, lambda squared.
 */
function matMulJJT(J) {
  const n = J[0].length;
  const JJt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) {
    for (let s = 0; s < 3; s++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += J[r][k] * J[s][k];
      JJt[r * 3 + s] = sum;
    }
  }
  return JJt;
}

/**
 * y = (J J^T + lambda^2 I)^{-1} * e  (e and y are 3-element arrays).
 */
function solveDLS3(J, e, lambda) {
  const JJt = matMulJJT(J);
  const lam2 = lambda * lambda;
  JJt[0] += lam2;
  JJt[4] += lam2;
  JJt[8] += lam2;
  const inv = invert3x3(JJt);
  if (!inv) return null;
  return [
    inv[0] * e[0] + inv[1] * e[1] + inv[2] * e[2],
    inv[3] * e[0] + inv[4] * e[1] + inv[5] * e[2],
    inv[6] * e[0] + inv[7] * e[1] + inv[8] * e[2],
  ];
}

/**
 * delta_theta (rad) = J^T * y  (y is 3x1, J is 3xn -> n x 1).
 */
function jacobianTtimesVec(J, y) {
  const n = J[0].length;
  const dTheta = new Array(n);
  for (let i = 0; i < n; i++) {
    dTheta[i] = J[0][i] * y[0] + J[1][i] * y[1] + J[2][i] * y[2];
  }
  return dTheta;
}

/**
 * Euclidean distance between two 3D points.
 */
function positionError(p, target) {
  return Math.hypot(target.x - p[0], target.y - p[1], target.z - p[2]);
}

/**
 * Damped least squares IK solver (revolute-only).
 *
 * @param {DHRow[]} rows - Current DH table (a, alpha, d, theta in degrees).
 * @param {string} convention - 'standard' | 'modified'
 * @param {{ x, y, z }} target - Desired end-effector position
 * @param {{ maxIterations?, positionTolerance?, damping?, finiteDiffDelta? }} options
 * @returns {{ success: boolean, reason?: string, iterations: number, finalError: number, thetas: number[] }}
 */
export function solveDampedLeastSquares(rows, convention, target, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const n = rows.length;
  const thetasDeg = rows.map((r) => r.theta);
  const thetasRad = thetasDeg.map((t) => t * DEG2RAD);
  const engine = new DHKinematics(convention);
  const targetArr = [target.x, target.y, target.z];

  for (let iter = 0; iter < opts.maxIterations; iter++) {
    engine.setRows(rowsWithThetas(rows, thetasDeg));
    const p = getEEPosition(engine);
    const e = [targetArr[0] - p[0], targetArr[1] - p[1], targetArr[2] - p[2]];
    const err = Math.hypot(...e);
    if (err <= opts.positionTolerance) {
      return {
        success: true,
        reason: 'converged',
        iterations: iter,
        finalError: err,
        thetas: thetasDeg.slice(),
      };
    }

    const J = computeJacobian(rows, convention, thetasRad, opts.finiteDiffDelta);
    const y = solveDLS3(J, e, opts.damping);
    if (!y) {
      return {
        success: false,
        reason: 'singular',
        iterations: iter,
        finalError: err,
        thetas: thetasDeg.slice(),
      };
    }
    const dThetaRad = jacobianTtimesVec(J, y);
    for (let i = 0; i < n; i++) {
      thetasRad[i] += dThetaRad[i];
      thetasDeg[i] = thetasRad[i] * RAD2DEG;
    }
  }

  engine.setRows(rowsWithThetas(rows, thetasDeg));
  const finalP = getEEPosition(engine);
  const finalErr = positionError(finalP, target);
  return {
    success: false,
    reason: 'max_iterations',
    iterations: opts.maxIterations,
    finalError: finalErr,
    thetas: thetasDeg.slice(),
  };
}

/**
 * Solve IK with the selected method. Single entry point for the UI.
 *
 * @param {string} method - 'dls' (damped least squares)
 * @param {DHRow[]} rows
 * @param {string} convention
 * @param {{ x, y, z }} target
 * @param {object} options
 */
export function solveIK(method, rows, convention, target, options = {}) {
  if (method === 'dls') {
    return solveDampedLeastSquares(rows, convention, target, options);
  }
  return {
    success: false,
    reason: 'unknown_method',
    iterations: 0,
    finalError: NaN,
    thetas: rows.map((r) => r.theta),
  };
}

export const IK_METHODS = [
  { id: 'dls', label: 'Damped least squares' },
];
