"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { CAM_Z, FOV, TileField } from "./TileField";

export default function GLCanvas() {
  // Start sharp, and drop resolution automatically on GPUs that can't keep up.
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));
  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={dpr}
        flat
        camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
        onCreated={({ gl }) => gl.setClearColor("#000000")}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(1.5, window.devicePixelRatio || 1, d + 0.25))}
          onFallback={() => setDpr(1)}
        />
        <TileField />
      </Canvas>
    </div>
  );
}
