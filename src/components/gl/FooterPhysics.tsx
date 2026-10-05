"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  ConvexHullCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { sound } from "@/lib/audio";
import { SHARD_CENTROID, SHARD_POINTS } from "@/lib/tiles";

const ZOOM = 100; // 1 world unit = 100 CSS px

function shardHull(size: number, depth: number) {
  const [cx, cy] = SHARD_CENTROID;
  const v: number[] = [];
  for (const z of [-depth / 2, depth / 2]) {
    for (const [x, y] of SHARD_POINTS) v.push((x - cx) * size, (y - cy) * size, z);
  }
  return new Float32Array(v);
}

function shardGeometry(size: number, depth: number) {
  const [cx, cy] = SHARD_CENTROID;
  const shape = new THREE.Shape(SHARD_POINTS.map(([x, y]) => new THREE.Vector2((x - cx) * size, (y - cy) * size)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: depth * 0.18,
    bevelSegments: 2,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

type Props = { anchor: RefObject<HTMLElement | null>; active: boolean };

function Scene({ anchor, active }: Props) {
  const size = useThree((s) => s.size);
  const canvasEl = useThree((s) => s.gl.domElement);
  const W = size.width / ZOOM;
  const H = size.height / ZOOM;
  const tileSize = size.width < 760 ? 0.52 : 0.78;
  const depth = tileSize * 0.16;
  const count = size.width < 760 ? 22 : 40;

  const geometry = useMemo(() => shardGeometry(tileSize, depth), [tileSize, depth]);
  const hull = useMemo(() => shardHull(tileSize * 1.04, depth * 1.3), [tileSize, depth]);
  const red = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#E8462A", roughness: 0.3, metalness: 0.05 }),
    [],
  );
  const graphite = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#202022", roughness: 0.26, metalness: 0.5 }),
    [],
  );

  const spawns = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * W * 0.85,
        y: H / 2 + 1 + i * 0.35,
        rz: Math.random() * Math.PI * 2,
        rx: (Math.random() - 0.5) * 0.6,
        isRed: Math.random() < 0.42,
      })),
    // Re-spawn only when the layout meaningfully changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );

  // The giant wordmark is a shelf the tiles land on. Measured after layout settles.
  const [shelf, setShelf] = useState<{ x: number; y: number; hw: number; hh: number; floor: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const c = canvasEl.getBoundingClientRect();
      if (c.width === 0 || r.width === 0) return;
      const round = (v: number) => Math.round(v * 100) / 100;
      setShelf({
        x: round((r.left + r.width / 2 - c.left - c.width / 2) / ZOOM),
        y: round(-(r.top + r.height * 0.55 - c.top - c.height / 2) / ZOOM),
        hw: round(r.width / 2 / ZOOM),
        hh: round((r.height * 0.45) / ZOOM),
        // Rest on the wordmark baseline so the pile never covers the footer links.
        floor: round(-(r.bottom - c.top - c.height / 2) / ZOOM),
      });
    };
    measure();
    const id = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(canvasEl);
    if (anchor.current) ro.observe(anchor.current);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [anchor, canvasEl]);

  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const pusher = useRef<RapierRigidBody>(null);
  const pointer = useRef({ x: 0, y: 0, inside: false });

  useEffect(() => {
    const canvas = canvasEl;
    const toWorld = (cx: number, cy: number) => {
      const c = canvas.getBoundingClientRect();
      return {
        x: (cx - c.left - c.width / 2) / ZOOM,
        y: -(cy - c.top - c.height / 2) / ZOOM,
        inside: cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom,
      };
    };
    const move = (e: PointerEvent) => {
      pointer.current = toWorld(e.clientX, e.clientY);
    };
    // Click or tap: throw nearby tiles up and away.
    const down = (e: PointerEvent) => {
      const p = toWorld(e.clientX, e.clientY);
      if (!p.inside) return;
      bodies.current.forEach((b) => {
        if (!b) return;
        const t = b.translation();
        const dx = t.x - p.x, dy = t.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 3) return;
        const k = (1 - d / 3) * b.mass();
        b.applyImpulse({ x: (dx / (d || 1)) * 6 * k, y: (10 + Math.random() * 4) * k, z: 0 }, true);
        b.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.3 * k, y: (Math.random() - 0.5) * 0.3 * k, z: (Math.random() - 0.5) * k }, true);
      });
      sound.whoosh(0.5, true, 0.6);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
    };
  }, [canvasEl]);

  useFrame(() => {
    const b = pusher.current;
    if (!b) return;
    const p = pointer.current;
    // Touch pointers only report while dragging, so this pushes on drag there.
    b.setNextKinematicTranslation(p.inside ? { x: p.x, y: p.y, z: 0 } : { x: 0, y: H * 3, z: 0 });
  });

  // Wait for the wordmark measurement so tiles never fall before the shelf exists.
  if (!active || !shelf) return null;
  const shelfKey = `${shelf.x}:${shelf.y}:${shelf.hw}:${shelf.floor}`;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 6, 8]} intensity={2.4} />
      <Environment resolution={64}>
        <Lightformer intensity={3} position={[0, 4, 6]} scale={[12, 2, 1]} />
        <Lightformer intensity={1.5} position={[-6, -2, 4]} rotation-y={Math.PI / 4} scale={[6, 6, 1]} />
        <Lightformer intensity={1} color="#E8462A" position={[6, 0, 3]} rotation-y={-Math.PI / 3} scale={[4, 8, 1]} />
      </Environment>
      <Physics gravity={[0, -26, 0]}>
        {/* Floor, walls, and a front/back slab that keeps the pile shallow. */}
        <CuboidCollider key={`floor-${shelfKey}`} args={[W, 0.5, 2]} position={[0, shelf.floor - 0.5, 0]} />
        <CuboidCollider args={[0.5, H * 4, 2]} position={[-W / 2 - 0.5, H, 0]} />
        <CuboidCollider args={[0.5, H * 4, 2]} position={[W / 2 + 0.5, H, 0]} />
        <CuboidCollider args={[W, H * 4, 0.5]} position={[0, H, -0.9]} />
        <CuboidCollider args={[W, H * 4, 0.5]} position={[0, H, 0.9]} />
        <CuboidCollider key={`shelf-${shelfKey}`} args={[shelf.hw, shelf.hh, 2]} position={[shelf.x, shelf.y, 0]} />

        <RigidBody ref={pusher} type="kinematicPosition" colliders={false} position={[0, H * 3, 0]}>
          <BallCollider args={[0.45]} />
        </RigidBody>

        {spawns.map((s, i) => (
          <RigidBody
            key={i}
            ref={(b) => {
              bodies.current[i] = b;
            }}
            colliders={false}
            position={[s.x, s.y, 0]}
            rotation={[s.rx, 0, s.rz]}
            linearDamping={0.1}
            angularDamping={0.3}
            restitution={0.25}
            friction={0.7}
            onCollisionEnter={({ target }) => {
              const v = target.rigidBody?.linvel();
              if (!v) return;
              const speed = Math.hypot(v.x, v.y, v.z);
              if (speed > 1.2) sound.thud(Math.min(1, speed / 9), Math.max(-1, Math.min(1, target.rigidBody!.translation().x / (W / 2))));
            }}
          >
            <ConvexHullCollider args={[hull]} />
            <mesh geometry={geometry} material={s.isRed ? red : graphite} />
          </RigidBody>
        ))}
      </Physics>
    </>
  );
}

export default function FooterPhysics(props: Props) {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      camera={{ zoom: ZOOM, position: [0, 0, 50], near: 0.1, far: 200 }}
      frameloop={props.active ? "always" : "never"}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
      style={{ pointerEvents: "none" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
