import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import FloatingObjects from './FloatingObjects';

function CameraRig() {
  const { camera, mouse } = useThree();

  useFrame(() => {
    // Smoothly interpolate the camera position based on mouse
    camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <header className="absolute top-0 left-0 w-full p-4 z-10">
        <h1 className="text-2xl font-bold">Lusion-Inspired Hero</h1>
      </header>

      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <fog attach="fog" args={['#000000', 10, 30]} />

        <Suspense fallback={null}>
          <FloatingObjects count={30} />
        </Suspense>

        <CameraRig />
      </Canvas>
    </div>
  );
}
