import { useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Sphere } from '@react-three/drei';

function FloatingSphere({ position }) {
  const ref = useRef();

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="ball" // <- this tells Rapier to use a spherical collider
      linearDamping={1}
      angularDamping={1}
    >
      <Sphere args={[1.5, 32, 32]}>
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.2}
          metalness={0.3}
          transmission={0.6}
          thickness={1}
          transparent
        />
      </Sphere>
    </RigidBody>
  );
}


export default function FloatingObjects({ count = 20 }) {
  const spheres = Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
    ],
  }));

  return (
    <>
      {spheres.map((props, i) => (
        <FloatingSphere key={i} {...props} />
      ))}
    </>
  );
}
