import { DHRow } from './dhKinematics.js';

/**
 * DH parameters (Standard convention) for famous robots.
 * Angles in degrees; lengths in meters (or same unit).
 * Sources: Craig (PUMA, Stanford), UR documentation (UR5).
 */

export const PRESETS = {
  'PUMA 560': {
    name: 'PUMA 560',
    convention: 'standard',
    rows: [
      new DHRow(0, 0, -90, 0, 0),
      new DHRow(1, 0, 0, 0, 0),
      new DHRow(2, 0.4318, 0, 0, 0),
      new DHRow(3, 0.0203, -90, 0.15005, 0),
      new DHRow(4, 0, 90, 0.4318, 0),
      new DHRow(5, 0, -90, 0, 0),
    ],
  },
  'Stanford Arm': {
    name: 'Stanford Arm',
    convention: 'standard',
    rows: [
      new DHRow(0, 0, -90, 0.1, 0),
      new DHRow(1, 0, 90, 0, 0),
      new DHRow(2, 0, 0, 0.2, 0),   // prismatic d2
      new DHRow(3, 0, -90, 0, 0),
      new DHRow(4, 0, 90, 0, 0),
      new DHRow(5, 0, 0, 0.1, 0),
    ],
  },
  'UR5': {
    name: 'UR5',
    convention: 'modified', // UR uses modified DH in many docs
    rows: [
      new DHRow(0, 0, 90, 0.089159, 0),
      new DHRow(1, -0.425, 0, 0, 0),
      new DHRow(2, -0.39225, 0, 0, 0),
      new DHRow(3, 0, 90, 0.10915, 0),
      new DHRow(4, 0, -90, 0.09465, 0),
      new DHRow(5, 0, 0, 0.0823, 0),
    ],
  },
  'Custom (6R)': {
    name: 'Custom (6R)',
    convention: 'standard',
    rows: [
      new DHRow(0, 0.1, 0, 0, 0),
      new DHRow(1, 0.2, -90, 0, 0),
      new DHRow(2, 0.2, 0, 0, 0),
      new DHRow(3, 0.15, -90, 0, 0),
      new DHRow(4, 0, 90, 0, 0),
      new DHRow(5, 0, -90, 0.05, 0),
    ],
  },
};

export function getPreset(id) {
  const p = PRESETS[id];
  if (!p) return null;
  return {
    name: p.name,
    convention: p.convention,
    rows: p.rows.map((r) => new DHRow(r.i, r.a, r.alpha, r.d, r.theta)),
  };
}
