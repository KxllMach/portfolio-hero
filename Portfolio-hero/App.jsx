import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import FloatingObjects from './FloatingObjects';

export default function App() {
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      <header className="absolute top-0 left-0 w-full p-4 z-10">
        <h1 className="text-2xl font-bold">Lusion-Inspired Hero</h1>
      </header>

      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} shadows>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <FloatingObjects count={30} />
        import { useRef } from 'react';
        import { useFrame, useThree } from '@react-three/fiber';

function CameraRig() {
  const { camera, mouse } = useThree();
  useFrame(() => {
    camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}
        <CameraRig />
      </Canvas>
    </div>
  );
}
