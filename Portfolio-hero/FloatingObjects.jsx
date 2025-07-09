import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';

function FloatingObject({ position, shape }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime() + position[0];
    ref.current.position.x += Math.sin(t) * 0.002;
    ref.current.position.y += Math.cos(t) * 0.002;
    ref.current.rotation.x += 0.005;
    ref.current.rotation.y += 0.005;
  });


  return (
    <group ref={ref} position={position}>
      {shape === 'box' ? (
        <Box args={[0.7, 0.7, 0.7]}>
          <meshStandardMaterial color="#61dafb" />
        </Box>
      ) : (
        <Sphere args={[0.4, 32, 32]}>
          <meshStandardMaterial color="#e91e63" />
        </Sphere>
      )}
    </group>
  );
}

export default function FloatingObjects({ count = 20 }) {
  const objects = Array.from({ length: count }, (_, i) => ({
    position: [
  (Math.random() - 0.5) * 20, // more spread
  (Math.random() - 0.5) * 12,
  (Math.random() - 0.5) * 10,
],
    shape: Math.random() > 0.5 ? 'box' : 'sphere',
  }));

  return (
    <>
      {objects.map((props, i) => (
        <FloatingObject key={i} {...props} />
      ))}
    </>
  );
}
