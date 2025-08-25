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
      frameloop="always" // Always render for continuous simulation
    >
      <color attach="background" args={['#151615']} />
      
      {/* RESTORED 3D LIGHTING - Proper depth and shadows */}
      <ambientLight intensity={1.2} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.8}
        castShadow={false}
      />
      <pointLight position={[-5, -5, -5]} intensity={0.4} decay={2} />
      <pointLight position={[3, -3, 8]} intensity={0.3} decay={2} />

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
      
      {/* ENHANCED ENVIRONMENT - Better 3D appearance */}
      <Environment resolution={16}> {/* Increased for better reflections */}
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={1.5} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
          <Lightformer form="ring" intensity={0.8} rotation-y={Math.PI / 2} position={[-10, 2, 0]} scale={4} />
        </group>
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

  // AUTO-START: Don't skip frames initially to ensure simulation starts
  let frameCount = 0
  useFrame((state, delta) => {
    if (!api.current) return
    
    frameCount++
    // Always run physics for first 180 frames (3 seconds), then optimize
    const shouldOptimize = frameCount > 180 && triggerImpulse === 0
    if (shouldOptimize && frameCount % 2 !== 0) return
    
    const t = state.clock.getElapsedTime()
    const currentPosition = api.current.translation()

    // Restored original physics for natural movement
    const forceMultiplier = 0.4
    const inward = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    api.current.applyImpulse(inward, true)

    // Restored torque for natural rotation
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
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
      angularDamping={0.5} // Restored for better movement
      friction={0.1}
      restitution={0.7} // Restored bouncing for better dynamics
      position={pos}
      ref={api}
      colliders={false}
      canSleep={false} // Prevent sleeping to ensure continuous movement
    >
      {/* RESTORED ORIGINAL COLLIDERS - Prevents clipping */}
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      
      {children ? children : <Model {...props} />}
      
      {/* REMOVED: Accent lights - Major performance boost */}
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()
  
  // AUTO-START: Always update pointer for immediate interaction
  useFrame(({ mouse, viewport }) => {
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

// BALANCED MATERIAL: Better 3D appearance with good performance
function Model({ color = 'white', roughness = 0.2, metalness = 0.5 }) {
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
      frustumCulled={true}
    >
      {/* BALANCED: Standard material with better visual properties */}
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={0.5} // Add environment reflections for depth
      />
    </mesh>
  )
}
