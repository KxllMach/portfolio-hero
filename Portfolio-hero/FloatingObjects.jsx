import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

// --- Connector Component ---
function Connector({ position, type }) {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      const body = ref.current;
      const pos = body.translation();

      // Attraction to center
      const toCenter = new THREE.Vector3(-pos.x, -pos.y, -pos.z).normalize();
      toCenter.multiplyScalar(0.08);
      body.applyImpulse(toCenter, true);

      // Wave-like floating motion
      const time = state.clock.getElapsedTime();
      const wave = new THREE.Vector3(
        Math.sin(time + pos.x) * 0.001,
        Math.cos(time + pos.y) * 0.001,
        Math.sin(time + pos.z) * 0.001
      );
      body.applyImpulse(wave, true);
    }
  });

  const getMaterial = () => {
    if (type === 'acid') {
      return <meshStandardMaterial color="#b0ff36" roughness={0.3} metalness={0.8} />;
    } else if (type === 'black') {
      return <meshStandardMaterial color="#111111" roughness={0.1} metalness={1} />;
    } else {
      return <meshStandardMaterial color="#f2f2f2" roughness={1} metalness={0} />;
    }
  };

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="cuboid"
      linearDamping={2.5}
      angularDamping={2.5}
    >
      <group>
        {/* Center Sphere */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          {getMaterial()}
        </mesh>

        {/* 6 arms in ±X, ±Y, ±Z */}
        {[
          [1.5, 0, 0, 0, 0, Math.PI / 2],
          [-1.5, 0, 0, 0, 0, Math.PI / 2],
          [0, 1.5, 0, 0, 0, 0],
          [0, -1.5, 0, 0, 0, 0],
          [0, 0, 1.5, Math.PI / 2, 0, 0],
          [0, 0, -1.5, Math.PI / 2, 0, 0],
        ].map(([x, y, z, rx, ry, rz], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[rx, ry, rz]}>
            <cylinderGeometry args={[0.25, 0.25, 1.5, 16]} />
            {getMaterial()}
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}

// --- Main Export ---
export default function FloatingObjects({ count = 20 }) {
  const types = [];

  // 2 black, 3 acid, rest offwhite
  types.push(...Array(2).fill('black'));
  types.push(...Array(3).fill('acid'));
  while (types.length < count) {
    types.push('offwhite');
  }

  // Shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const connectors = Array.from({ length: count }, (_, i) => {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 6;
    const z = (Math.random() - 0.5) * 6;
    return {
      position: [x, y, z],
      type: types[i],
    };
  });

  return (
    <>
      {connectors.map((item, i) => (
        <Connector key={i} position={item.position} type={item.type} />
      ))}
    </>
  );
}
