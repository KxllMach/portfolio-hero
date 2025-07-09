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
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
