import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

function Connector({ position, type }) {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      const body = ref.current;
      const pos = body.translation();

      const toCenter = new THREE.Vector3(-pos.x, -pos.y, -pos.z).normalize();
      toCenter.multiplyScalar(0.08);
      body.applyImpulse(toCenter, true);

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
        {/* Center sphere */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          {getMaterial()}
        </mesh>

        {/* Cylindrical arms in 6 directions */}
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

export default Connector;
