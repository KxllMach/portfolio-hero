import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import FloatingObjects from './FloatingObjects';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import * as THREE from 'three';

function CursorCollider() {
  const { camera, mouse, viewport } = useThree();
  const cursorRef = useRef();

  useFrame(() => {
    if (cursorRef.current) {
      // Convert mouse [-1, 1] to 3D position in world
      const vec = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
      cursorRef.current.setTranslation(vec, true);
    }
  });

  return (
    <RigidBody
      ref={cursorRef}
      type="kinematicPosition"
      colliders="ball"
      collisionGroups={{ groups: 0b0010, masks: 0b0001 }} // optional filtering
    >
      <mesh visible={false}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="hotpink" transparent opacity={0.2} />
      </mesh>
    </RigidBody>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#151615' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
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

        <CursorCollider />
        <Physics gravity={[0, 0, 0]} colliders={false}>
          <FloatingObjects count={20} />
        </Physics>
      </Canvas>
    </div>
  );
}
