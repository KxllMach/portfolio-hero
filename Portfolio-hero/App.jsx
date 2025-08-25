import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'

// 🎨 Accent colors
const accents = ['#4060ff', '#8FFE09', '#ED141F', '#fff500']

// Shuffle with clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.8 },
  { color: '#444', roughness: 0.75, metalness: 0.2 },
  { color: 'white', roughness: 0.75, metalness: 0 },
  { color: 'white', roughness: 0.75, metalness: 0 },
  { color: 'white', roughness: 0.1, metalness: 0.2 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.5, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const [triggerImpulse, setTriggerImpulse] = useState(0);
  
  const connectors = useMemo(() => shuffle(accent), [accent])

  const handleCanvasClick = useCallback(() => {
    click();
    setTriggerImpulse(prev => prev + 1);
  }, []);

  return (
    <Canvas
      onClick={handleCanvasClick}
      dpr={[1, 1.25]} // Reduced from 1.5
      gl={{ 
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        alpha: false, // No alpha blending
        preserveDrawingBuffer: false, // Don't preserve buffer
        premultipliedAlpha: false,
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
      frameloop="demand" // Only render when needed
    >
      <color attach="background" args={['#151615']} />
      
      {/* MINIMAL LIGHTING - Major performance boost */}
      <ambientLight intensity={1.8} /> {/* Single ambient light only */}

      <Physics 
        gravity={[0, 0, 0]} 
        maxSubSteps={1} // Reduced from 2
        timeStep={1/60}
        interpolation={false} // Disable interpolation for better performance
      >
        <Pointer />
        {connectors.map((props, i) => <Connector key={i} triggerImpulse={triggerImpulse} {...props} />)}
      </Physics>

      {/* REMOVED POST-PROCESSING - Huge performance gain */}
      
      {/* MINIMAL ENVIRONMENT */}
      <Environment resolution={8}> {/* Reduced from 16 */}
        <Lightformer form="circle" intensity={1} position={[0, 5, -9]} scale={2} />
      </Environment>
    </Canvas>
  )
}

function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, triggerImpulse, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [position])

  // Cached values
  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  const oscSpeeds = useMemo(() => ({
    x: 0.8,
    y: 1.0,
    z: 0.6
  }), [])

  // PERFORMANCE: Reduce update frequency
  let frameCount = 0
  useFrame((state, delta) => {
    frameCount++
    if (frameCount % 2 !== 0) return // Skip every other frame
    
    if (!api.current) return
    const t = state.clock.getElapsedTime()

    const currentPosition = api.current.translation()

    // Simplified physics calculations
    const forceMultiplier = 0.4
    const inward = {
      x: -currentPosition.x * forceMultiplier,
      y: -currentPosition.y * forceMultiplier, 
      z: -currentPosition.z * forceMultiplier
    }

    api.current.applyImpulse(inward, true)

    // REMOVED: Complex oscillations and torque for better performance
  })

  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation();
      vec.set(currentPosition.x, currentPosition.y, currentPosition.z)
      vec.normalize()
      vec.multiplyScalar(50)
      api.current.applyImpulse(vec, true);
    }
  }, [triggerImpulse, vec]);

  return (
    <RigidBody
      linearDamping={2}  
      angularDamping={0.8} // Increased damping to reduce calculations
      friction={0.1}
      restitution={0.5} // Reduced bouncing
      position={pos}
      ref={api}
      colliders={false}
      canSleep={true} // Allow sleeping for inactive objects
    >
      {/* REDUCED COLLIDERS - Single collider instead of 3 */}
      <CuboidCollider args={[1, 1, 1]} />
      
      {children ? children : <Model {...props} />}
      
      {/* REMOVED: Accent lights - Major performance boost */}
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()
  
  // PERFORMANCE: Reduce pointer update frequency
  let frameCount = 0
  useFrame(({ mouse, viewport }) => {
    frameCount++
    if (frameCount % 3 !== 0) return // Update every 3rd frame only
    
    ref.current?.setNextKinematicTranslation(
      vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0)
    )
  })
  
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.4]} />
    </RigidBody>
  )
}

// PERFORMANCE: Simplified material with fewer properties
function Model({ color = 'white', roughness = 0.5, metalness = 0.2 }) {
  const ref = useRef()
  const { nodes } = useGLTF('/c-transformed.glb')

  useFrame((state, delta) => {
    if (ref.current && ref.current.material) {
      ref.current.material.color.set(color);
    }
  })

  return (
    <mesh
      ref={ref}
      castShadow={false}
      receiveShadow={false}
      scale={10}
      geometry={nodes.connector.geometry}
      frustumCulled={true} // Enable frustum culling
    >
      {/* SWITCHED TO STANDARD MATERIAL - Much better performance */}
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        // Removed clearcoat and other expensive properties
      />
    </mesh>
  )
}
