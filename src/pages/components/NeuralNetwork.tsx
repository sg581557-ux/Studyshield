import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';

const NODE_COUNT = 72;
const LINK_DIST = 3.6;
const ACTIVE_MAX = 12;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SceneProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

function NeuralScene({ mouseX, mouseY }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const nodeMat = useRef<THREE.PointsMaterial>(null);
  const linkMat = useRef<THREE.LineBasicMaterial>(null);
  const activeLinkMat = useRef<THREE.LineBasicMaterial>(null);
  const activeNodeMat = useRef<THREE.PointsMaterial>(null);
  const wireMat = useRef<THREE.MeshBasicMaterial>(null);
  const activePoints = useRef<THREE.Points>(null);
  const activeLinks = useRef<THREE.LineSegments>(null);

  const { nodePos, edges } = useMemo(() => {
    const rand = mulberry32(1337);
    const nodePos = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      nodePos[i * 3] = (rand() * 2 - 1) * 7.2;
      nodePos[i * 3 + 1] = (rand() * 2 - 1) * 4.4;
      nodePos[i * 3 + 2] = (rand() * 2 - 1) * 3.4;
    }
    const edges: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodePos[i * 3] - nodePos[j * 3];
        const dy = nodePos[i * 3 + 1] - nodePos[j * 3 + 1];
        const dz = nodePos[i * 3 + 2] - nodePos[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) edges.push([i, j]);
      }
    }
    return { nodePos, edges };
  }, []);

  const linkPos = useMemo(() => {
    const arr = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], k) => {
      arr[k * 6] = nodePos[a * 3];
      arr[k * 6 + 1] = nodePos[a * 3 + 1];
      arr[k * 6 + 2] = nodePos[a * 3 + 2];
      arr[k * 6 + 3] = nodePos[b * 3];
      arr[k * 6 + 4] = nodePos[b * 3 + 1];
      arr[k * 6 + 5] = nodePos[b * 3 + 2];
    });
    return arr;
  }, [edges, nodePos]);

  const activeLinkPos = useMemo(() => new Float32Array(edges.length * 6), [edges.length]);

  useEffect(() => {
    const tick = () => {
      const count = 6 + Math.floor(Math.random() * 5);
      const set = new Set<number>();
      while (set.size < count) set.add(Math.floor(Math.random() * NODE_COUNT));
      const idxs = [...set];

      const pg = activePoints.current?.geometry;
      if (pg) {
        const arr = pg.attributes.position.array as Float32Array;
        arr.fill(0);
        idxs.forEach((idx, i) => {
          arr[i * 3] = nodePos[idx * 3];
          arr[i * 3 + 1] = nodePos[idx * 3 + 1];
          arr[i * 3 + 2] = nodePos[idx * 3 + 2];
        });
        pg.attributes.position.needsUpdate = true;
        pg.setDrawRange(0, idxs.length);
      }

      const lg = activeLinks.current?.geometry;
      if (lg) {
        let k = 0;
        edges.forEach(([a, b]) => {
          if (set.has(a) || set.has(b)) {
            activeLinkPos[k * 6] = nodePos[a * 3];
            activeLinkPos[k * 6 + 1] = nodePos[a * 3 + 1];
            activeLinkPos[k * 6 + 2] = nodePos[a * 3 + 2];
            activeLinkPos[k * 6 + 3] = nodePos[b * 3];
            activeLinkPos[k * 6 + 4] = nodePos[b * 3 + 1];
            activeLinkPos[k * 6 + 5] = nodePos[b * 3 + 2];
            k++;
          }
        });
        lg.attributes.position.needsUpdate = true;
        lg.setDrawRange(0, k * 2);
      }
    };
    tick();
    const id = window.setInterval(tick, 1900);
    return () => window.clearInterval(id);
  }, [edges, nodePos, activeLinkPos]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.05;
      group.current.rotation.x = Math.sin(t * 0.22) * 0.05;
    }
    if (nodeMat.current) nodeMat.current.opacity = 0.5 + Math.sin(t * 1.2) * 0.15;
    if (linkMat.current) linkMat.current.opacity = 0.13 + Math.sin(t * 0.8 + 1.4) * 0.09;
    if (activeLinkMat.current) activeLinkMat.current.opacity = 0.45 + Math.sin(t * 2.4) * 0.25;
    if (activeNodeMat.current) activeNodeMat.current.opacity = 0.85 + Math.sin(t * 2.8) * 0.15;
    if (wireMat.current) wireMat.current.opacity = 0.05 + Math.sin(t * 0.7) * 0.025;

    camera.position.x += (mouseX.get() * 1.8 - camera.position.x) * 0.045;
    camera.position.y += (-mouseY.get() * 1.3 - camera.position.y) * 0.045;
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={nodeMat}
          size={0.13}
          color="#7cc4ff"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <points ref={activePoints}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(ACTIVE_MAX * 3), 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={activeNodeMat}
          size={0.3}
          color="#e0f2ff"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linkPos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={linkMat}
          color="#3b82f6"
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <lineSegments ref={activeLinks}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[activeLinkPos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={activeLinkMat}
          color="#22d3ee"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <mesh>
        <icosahedronGeometry args={[3.7, 1]} />
        <meshBasicMaterial ref={wireMat} color="#60a5fa" wireframe transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

export default function NeuralNetwork({
  active,
  mouseX,
  mouseY,
}: {
  active: boolean;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {active ? (
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 14], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <NeuralScene mouseX={mouseX} mouseY={mouseY} />
        </Canvas>
      ) : null}
    </div>
  );
}
