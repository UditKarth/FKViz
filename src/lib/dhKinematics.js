/**
 * Pure JavaScript Denavit-Hartenberg kinematics engine.
 * Supports Standard (Craig) and Modified (Khalil) DH conventions.
 * All matrices are 4x4 in column-major order (Three.js compatible).
 */

const DEG2RAD = Math.PI / 180;

/**
 * Multiplies two 4x4 matrices (column-major). Returns new array of 16 elements.
 */
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

/**
 * Builds 4x4 rotation matrix around Z (column-major).
 */
function rotZ(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Builds 4x4 rotation matrix around X (column-major).
 */
function rotX(alpha) {
  const c = Math.cos(alpha);
  const s = Math.sin(alpha);
  return [
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Builds 4x4 translation matrix (column-major): x, y, z.
 */
function trans(x, y, z) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ];
}

/**
 * Standard DH (Craig): T_i = Rot(Z, θ_i) * Trans(0,0,d_i) * Trans(a_i,0,0) * Rot(X, α_i)
 * Parameters for link i: a_i, alpha_i, d_i, theta_i (radians).
 */
function standardDH(a, alpha, d, theta) {
  const Rz = rotZ(theta);
  const Tz = trans(0, 0, d);
  const Tx = trans(a, 0, 0);
  const Rx = rotX(alpha);
  return multiply4x4(multiply4x4(multiply4x4(Rz, Tz), Tx), Rx);
}

/**
 * Modified DH (Khalil): T_i = Rot(X, α_{i-1}) * Trans(a_{i-1},0,0) * Rot(Z, θ_i) * Trans(0,0,d_i)
 * Parameters for link i use a_i, alpha_i, d_i, theta_i (same table, different composition).
 */
function modifiedDH(a, alpha, d, theta) {
  const Rx = rotX(alpha);
  const Tx = trans(a, 0, 0);
  const Rz = rotZ(theta);
  const Tz = trans(0, 0, d);
  return multiply4x4(multiply4x4(multiply4x4(Rx, Tx), Rz), Tz);
}

/**
 * Single row of DH table: { i, a, alpha, d, theta } in user units (degrees for angles).
 */
export class DHRow {
  constructor(i, a = 0, alpha = 0, d = 0, theta = 0) {
    this.i = i;
    this.a = Number(a);
    this.alpha = Number(alpha);
    this.d = Number(d);
    this.theta = Number(theta);
  }

  toRadians() {
    return {
      a: this.a,
      alpha: this.alpha * DEG2RAD,
      d: this.d,
      theta: this.theta * DEG2RAD,
    };
  }
}

/**
 * DH Kinematics Engine: chain of joints, Standard or Modified convention.
 */
export class DHKinematics {
  constructor(convention = 'standard') {
    this.convention = convention; // 'standard' | 'modified'
    this.rows = [];
  }

  setConvention(convention) {
    this.convention = convention;
  }

  setRows(rows) {
    this.rows = rows.map((r) =>
      r instanceof DHRow
        ? r
        : new DHRow(r.i ?? r.link, r.a, r.alpha, r.d, r.theta)
    );
  }

  /**
   * Returns i-1_T_i (4x4 column-major) for link index (0-based).
   */
  getTransform(i) {
    if (i < 0 || i >= this.rows.length) return identity4();
    const r = this.rows[i].toRadians();
    return this.convention === 'modified'
      ? modifiedDH(r.a, r.alpha, r.d, r.theta)
      : standardDH(r.a, r.alpha, r.d, r.theta);
  }

  /**
   * Returns 0_T_i = product of T_1 * T_2 * ... * T_i (base to link i).
   */
  getForwardTransform(upToIndex) {
    let T = identity4();
    for (let i = 0; i <= upToIndex && i < this.rows.length; i++) {
      T = multiply4x4(T, this.getTransform(i));
    }
    return T;
  }

  /**
   * End-effector pose: 0_T_ee (base to last link).
   */
  getEndEffectorPose() {
    return this.getForwardTransform(this.rows.length - 1);
  }

  /**
   * All link poses in base frame: [ 0_T_1, 0_T_2, ... ].
   */
  getAllPoses() {
    const poses = [];
    let T = identity4();
    for (let i = 0; i < this.rows.length; i++) {
      T = multiply4x4(T, this.getTransform(i));
      poses.push(T.slice(0));
    }
    return poses;
  }

  /**
   * Matrix elements for the selected row (i-1_T_i) with sine/cosine breakdown info.
   */
  getTransformBreakdown(i) {
    if (i < 0 || i >= this.rows.length) return null;
    const r = this.rows[i].toRadians();
    const cθ = Math.cos(r.theta);
    const sθ = Math.sin(r.theta);
    const cα = Math.cos(r.alpha);
    const sα = Math.sin(r.alpha);
    const a = r.a;
    const d = r.d;

    if (this.convention === 'standard') {
      return {
        elements: this.getTransform(i),
        // Standard DH 4x4 matrix layout (column-major)
        terms: {
          r11: `cos(θ${i})`, r12: `-sin(θ${i})`, r13: '0', r14: `a${i}`,
          r21: `sin(θ${i})cos(α${i})`, r22: `cos(θ${i})cos(α${i})`, r23: `-sin(α${i})`, r24: `-d${i}*sin(α${i})`,
          r31: `sin(θ${i})sin(α${i})`, r32: `cos(θ${i})sin(α${i})`, r33: `cos(α${i})`, r34: `d${i}*cos(α${i})`,
          r41: '0', r42: '0', r43: '0', r44: '1',
          numeric: {
            r11: cθ, r12: -sθ, r13: 0, r14: a,
            r21: sθ * cα, r22: cθ * cα, r23: -sα, r24: -d * sα,
            r31: sθ * sα, r32: cθ * sα, r33: cα, r34: d * cα,
            r41: 0, r42: 0, r43: 0, r44: 1,
          },
        },
      };
    } else {
      return {
        elements: this.getTransform(i),
        terms: {
          r11: `cos(θ${i})`, r12: `-sin(θ${i})`, r13: '0', r14: `a${i}`,
          r21: `sin(θ${i})cos(α${i})`, r22: `cos(θ${i})cos(α${i})`, r23: `-sin(α${i})`, r24: `-d${i}*sin(α${i})`,
          r31: `sin(θ${i})sin(α${i})`, r32: `cos(θ${i})sin(α${i})`, r33: `cos(α${i})`, r34: `d${i}*cos(α${i})`,
          r41: '0', r42: '0', r43: '0', r44: '1',
          numeric: {
            r11: cθ, r12: -sθ, r13: 0, r14: a,
            r21: sθ * cα, r22: cθ * cα, r23: -sα, r24: -d * sα,
            r31: sθ * sα, r32: cθ * sα, r33: cα, r34: d * cα,
            r41: 0, r42: 0, r43: 0, r44: 1,
          },
        },
      };
    }
  }

  /**
   * Human-readable description of the current transform for row i (for "Explain This Frame").
   */
  explainFrame(i) {
    if (i < 0 || i >= this.rows.length) return '';
    const row = this.rows[i];
    const deg = (x) => `${Number(x).toFixed(1)}°`;
    const dist = (x) => `${Number(x).toFixed(3)}`;
    const steps = [];
    if (this.convention === 'standard') {
      steps.push(`Rotate ${deg(row.theta)} around Z${i}`);
      if (row.d !== 0) steps.push(`Translate ${dist(row.d)} along Z${i}`);
      if (row.a !== 0) steps.push(`Translate ${dist(row.a)} along X${i + 1}`);
      if (row.alpha !== 0) steps.push(`Rotate ${deg(row.alpha)} around X${i + 1}`);
    } else {
      if (row.alpha !== 0) steps.push(`Rotate ${deg(row.alpha)} around X${i}`);
      if (row.a !== 0) steps.push(`Translate ${dist(row.a)} along X${i}`);
      steps.push(`Rotate ${deg(row.theta)} around Z${i}`);
      if (row.d !== 0) steps.push(`Translate ${dist(row.d)} along Z${i}`);
    }
    return steps.join(', then ');
  }
}

function identity4() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export { multiply4x4, rotZ, rotX, trans, standardDH, modifiedDH };
