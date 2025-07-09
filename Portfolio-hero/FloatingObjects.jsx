import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useRef } from 'react';

export default function FloatingObjects({ count = 20 }) {
  const { mouse, camera } = useThree();
  const bodies = useRef([]);
  const cursorPos = new THREE.Vector3();

  useFrame(() => {
    // Convert 2D mouse coords to 3D world space
    cursorPos.set(mouse.x, mouse.y, 0.5).unproject(camera);

    for (let i = 0; i < bodies.current.length; i++) {
      const body = bodies.current[i];
      if (!body) continue;

      const pos = body.translation();
      const dx = pos.x - cursorPos.x;
      const dy = pos.y - cursorPos.y;
      const dz = pos.z - cursorPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      const radius = 4; // area of influence
      if (distSq < radius * radius) {
        const strength = 10 / (distSq + 0.5); // stronger closer to cursor
        const impulse = {
          x: dx * strength,
          y: dy * strength,
          z: dz * strength,
        };
        body.applyImpulse(impulse, true);
      }
    }
  });

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <RigidBody
          key={i}
          ref={(ref) => (bodies.current[i] = ref)}
          colliders="ball"
          mass={1}
          linearDamping={2.5}
          angularDamping={2.5}
          position={[
            THREE.MathUtils.randFloatSpread(10),
            THREE.MathUtils.randFloatSpread(10),
            THREE.MathUtils.randFloatSpread(10),
          ]}
        >
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
