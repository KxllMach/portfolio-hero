import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

function FloatingSphere({ position, type }) {
  const ref = useRef();

  // Apply soft attraction + idle motion
  useFrame((state) => {
    if (ref.current) {
      const body = ref.current;
      const pos = body.translation();

      // Constant attraction to center
      const toCenter = new THREE.Vector3(-pos.x, -pos.y, -pos.z).normalize();
      toCenter.multiplyScalar(0.08); // gentler attraction
      body.applyImpulse(toCenter, true);

      // Add soft floating (water-like movement)
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
      return (
        <meshStandardMaterial
          color="#b0ff36"
          roughness={0.3}
          metalness={0.8}
        />
      );
    } else if (type === 'black') {
      return (
        <meshStandardMaterial
          color="#111111"
          roughness={0.1}
          metalness={1}
        />
      );
    } else {
      return (
        <meshStandardMaterial
          color="#f2f2f2"
          roughness={1}
          metalness={0}
        />
      );
    }
  };

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="ball"
      linearDamping={2.5}
      angularDamping={2.5}
      onCollisionEnter={() => {
        if (ref.current) {
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }}
    >
      <Sphere args={[1.5, 32, 32]}>
        {getMaterial()}
      </Sphere>
    </RigidBody>
  );
}


export default function FloatingObjects({ count = 20 }) {
  const types = [];

  types.push(...Array(2).fill('black'));
  types.push(...Array(3).fill('acid'));
  while (types.length < count) {
    types.push('offwhite');
  }

  // Shuffle types
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const spheres = Array.from({ length: count }, (_, i) => {
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
      {spheres.map((sphere, i) => (
        <FloatingSphere
          key={i}
          position={sphere.position}
          type={sphere.type}
        />
      ))}
    </>
  );
}
