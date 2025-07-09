import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';

function FloatingObject({ position, shape }) {
  const ref = useRef();

  useFrame((state, delta) => {
    ref.current.rotation.x += delta * 0.5;
    ref.current.rotation.y += delta * 0.5;
    ref.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.005;
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
    position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6],
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