/**
 * Export current DH configuration to a valid URDF snippet (XML).
 * Maps DH parameters to joint and link elements.
 */

export function dhToURDF(rows, robotName = 'fk_robot') {
  const lines = [
    `<?xml version="1.0"?>`,
    `<robot name="${robotName}">`,
    `  <link name="base_link">`,
    `    <visual><geometry><box size="0.1 0.1 0.05"/></geometry>`,
    `      <material name="dark"><color rgba="0.2 0.2 0.2 1"/></material></visual>`,
    `  </link>`,
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const linkName = `link_${i}`;
    const jointName = `joint_${i + 1}`;
    const parent = i === 0 ? 'base_link' : `link_${i - 1}`;
    const child = linkName;

    // Joint: revolute with axis Z; origin from DH (a, 0, d) and R(alpha about X) for standard
    const x = r.a;
    const y = 0;
    const z = r.d;
    const roll = (r.alpha * Math.PI) / 180;
    const pitch = 0;
    const yaw = (r.theta * Math.PI) / 180;

    lines.push(`  <link name="${linkName}">`);
    lines.push(`    <visual>`);
    lines.push(`      <origin xyz="0 0 0" rpy="0 0 0"/>`);
    lines.push(`      <geometry><cylinder length="0.02" radius="0.01"/></geometry>`);
    lines.push(`      <material name="gray"><color rgba="0.5 0.5 0.5 1"/></material>`);
    lines.push(`    </visual>`);
    lines.push(`  </link>`);

    lines.push(`  <joint name="${jointName}" type="revolute">`);
    lines.push(`    <parent link="${parent}"/>`);
    lines.push(`    <child link="${child}"/>`);
    lines.push(`    <origin xyz="${x} ${y} ${z}" rpy="${roll} ${pitch} ${yaw}"/>`);
    lines.push(`    <axis xyz="0 0 1"/>`);
    lines.push(`    <limit lower="-3.14159" upper="3.14159" effort="10" velocity="1"/>`);
    lines.push(`  </joint>`);
  }

  lines.push(`</robot>`);
  return lines.join('\n');
}
