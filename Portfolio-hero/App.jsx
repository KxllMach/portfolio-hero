import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import FloatingObjects from './FloatingObjects';

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

        
        <Physics gravity={[0, 0, 0]} colliders={false}>
          <FloatingObjects count={20} />
        </Physics>
      </Canvas>
    </div>
  );
}
