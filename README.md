# Interactive FK Pedagogical Laboratory

A teaching tool for **Forward Kinematics** using Denavit–Hartenberg (DH) parameters, built with React, Three.js, and React-Three-Fiber.

## Features

- **Side-by-side layout**: 3D canvas (left) and dynamic DH table (right)
- **DH table**: Columns for Link (i), aᵢ, αᵢ, dᵢ, θᵢ with editable values
- **Visual linking**: Hover over an **aᵢ** cell to highlight the corresponding link length on the 3D robot with a dimension line
- **Nested FK chain**: Jointₙ is a child of Jointₙ₋₁ so transformations propagate correctly
- **Axis frames**: Each joint shows local axes (X=red, Y=green, Z=blue) with **Z** labels via `@react-three/drei` `<Html>`
- **Conventions**: Toggle between **Standard DH** and **Modified DH**
- **Transformation matrix**: View ⁱ⁻¹Tᵢ for the selected row with live sin/cos values
- **Ghosting**: When you change a joint angle, a faded “ghost” of the previous pose is shown
- **Workspace trace**: Use **Record** to draw a line following the end-effector as you move the joints
- **Explain This Frame**: Human-readable description of the selected transform (e.g. “Rotate 90° around Z, then translate 5 units along X”)
- **Export to URDF**: Download the current DH configuration as a valid URDF snippet
- **Presets**: PUMA 560, Stanford Arm, UR5, and a custom 6R chain

## Run

```bash
npm install
npm run dev
```

Then open the URL shown (e.g. http://localhost:5173).

## Tech stack

- **React** + **Vite**
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- **Radix UI** (tabs, dropdown, switch, label)
- **Lucide React** (icons)
- **Tailwind CSS** (v4, dark theme)

## Project structure

- `src/lib/dhKinematics.js` – Pure JS DH engine (Standard & Modified), matrix math
- `src/lib/presets.js` – Robot presets (PUMA 560, Stanford Arm, UR5)
- `src/lib/urdfExport.js` – DH → URDF XML
- `src/components/Scene.jsx` – 3D scene: nested joints, axes, ghost, trace
- `src/components/Canvas3D.jsx` – R3F canvas wrapper
- `src/components/DHTable.jsx` – Editable DH table with hover
- `src/components/MatrixDisplay.jsx` – ⁱ⁻¹Tᵢ matrix display
- `src/components/ExplainFrame.jsx` – “Explain This Frame” panel
- `src/App.jsx` – Layout, state, presets, convention, record, export
