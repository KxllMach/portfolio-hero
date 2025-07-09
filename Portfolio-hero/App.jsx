import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import FloatingObjects from './FloatingObjects';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import * as THREE from 'three';

function CursorCollider() {
  const { camera, mouse } = useThree();
  const cursorRef = useRef();
  const vec = new THREE.Vector3();

  useFrame(() => {
    if (!cursorRef.current) return;

    vec.set(mouse.x, mouse.y, 0.5).unproject(camera);

    cursorRef.current.setTranslation(
      { x: vec.x, y: vec.y, z: vec.z },
      true
    );
  });

  return (
    <RigidBody
      ref={cursorRef}
      type="kinematicPosition"
      colliders="ball"
      collisionGroups={{ groups: 0b0010, masks: 0b0001 }}
    >
      <mesh visible={true}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#151615' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50, near: 0.1, far: 100 }}
        shadows
        gl={{ physicallyCorrectLights: true }}
      >
        <ambientLight intensity={0.6} />
          <directionalLight
          position={[5, 5, 5]}
          intensity={4}
          color="#ffffff"
          castShadow
        />

        <Physics gravity={[0, 0, 0]} colliders={false}>
          <FloatingObjects count={20} />
          <CursorCollider />
        </Physics>
      </Canvas>
    </div>
  );
}
