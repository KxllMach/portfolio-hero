import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Icosahedron, TorusKnot, Dodecahedron } from '@react-three/drei';
import * as THREE from 'three';

function FloatingShape({ position, type, shape }) {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      const body = ref.current;
      const pos = body.translation();

      // Attraction to center
      const toCenter = new THREE.Vector3(-pos.x, -pos.y, -pos.z).normalize();
      toCenter.multiplyScalar(0.08);
      body.applyImpulse(toCenter, true);

      // Floating motion
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

  const Shape = {
    icosahedron: <Icosahedron args={[1.5, 0]}>{getMaterial()}</Icosahedron>,
    dodecahedron: <Dodecahedron args={[1.5]}>{getMaterial()}</Dodecahedron>,
    torusKnot: <TorusKnot args={[0.6, 0.25, 64, 16]}>{getMaterial()}</TorusKnot>,
  }[shape];

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="hull"
      linearDamping={2.5}
      angularDamping={2.5}
    >
      {Shape}
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

  // Shuffle materials
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  // Generate shape and position
  const items = Array.from({ length: count }, (_, i) => {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 6;
    const z = (Math.random() - 0.5) * 6;

    // Randomly choose a shape
    const shape = Math.random() < 0.6 ? 'icosahedron' : Math.random() < 0.8 ? 'dodecahedron' : 'torusKnot';

    return {
      position: [x, y, z],
      type: types[i],
      shape,
    };
  });

  return (
    <>
      {items.map((item, i) => (
        <FloatingShape
          key={i}
          position={item.position}
          type={item.type}
          shape={item.shape}
        />
      ))}
    </>
  );
}
