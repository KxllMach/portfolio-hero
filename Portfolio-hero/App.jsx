import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'

// 🎨 Accent colors
const accents = ['#4060ff', '#8FFE09', '#ED141F', '#fff500']

// Shuffle with clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0, clearcoat: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.8, clearcoat: 1 },
  { color: '#444', roughness: 0.75, metalness: 0.2, clearcoat: 0.8 },
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 0.1},
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 1 },
  { color: 'white', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, clearcoat: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.5, clearcoat: 1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  // State to trigger impulse on click
  const [triggerImpulse, setTriggerImpulse] = useState(0);
  
  const connectors = useMemo(() => shuffle(accent), [accent])

  // Handle canvas click: change accent and trigger impulse - optimized with useCallback
  const handleCanvasClick = useCallback(() => {
    click(); // Change color accent
    setTriggerImpulse(prev => prev + 1); // Increment to trigger impulse
  }, []);

  return (
    <Canvas
      onClick={handleCanvasClick} // Use the new handler
      dpr={[1, 1.5]}
      gl={{ 
        antialias: false,
        powerPreference: "high-performance", // Request high-performance GPU
        stencil: false, // Disable stencil buffer for better performance
      }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={0.8} />
      {/* SpotLight configured for focused shadows - optimized shadow settings */}
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow
        shadow-mapSize={[256, 256]} // Reduced from 512 for better performance
        shadow-camera-fov={15}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />

      <Physics 
        gravity={[0, 0, 0]} 
        maxSubSteps={2} // Reduced from 3 for better performance
        timeStep={1/60} // Fixed timestep for consistent performance
      >
        <Pointer />
        {/* Pass triggerImpulse to each Connector */}
        {connectors.map((props, i) => <Connector key={i} triggerImpulse={triggerImpulse} {...props} />)}
      </Physics>

      <EffectComposer 
        disableNormalPass 
        multisampling={2} // Reduced from 4 for better performance
      >
        <N8AO 
          distanceFalloff={1} 
          aoRadius={1} 
          intensity={3.5}
          samples={16} // Reduced samples for better performance
        />
      </EffectComposer>

      <Environment resolution={128}> {/* Reduced from 256 for better performance */}
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={6} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
        </group>
      </Environment>
    </Canvas>
  )
}

function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, triggerImpulse, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [position])

  // Random offsets for individual oscillation - cached for better performance
  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  // Pre-calculate oscillation speeds for performance
  const oscSpeeds = useMemo(() => ({
    x: 0.8,
    y: 1.0,
    z: 0.6
  }), [])

  useFrame((state, delta) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()

    // Get current position
    const currentPosition = api.current.translation()

    // ✅ Strong inward pull to center - batch calculations for better performance
    const forceMultiplier = 0.4
    const inward = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    // ✅ Apply impulse and explicitly wake up the body
    api.current.applyImpulse(inward, true)

    // ✅ Add small torque for random rotation - batch calculations
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
  })

  // Effect to apply impulse when triggerImpulse changes - optimized to reuse vector
  useEffect(() => {
    if (api.current && triggerImpulse > 0) { // Only apply if triggerImpulse is incremented
      const currentPosition = api.current.translation();
      
      // Reuse the existing vec object to avoid creating new Vector3
      vec.set(currentPosition.x, currentPosition.y, currentPosition.z)
      vec.normalize()
      vec.multiplyScalar(50) // Adjust this value to control how strong the push is

      api.current.applyImpulse(vec, true);
    }
  }, [triggerImpulse, vec]); // Include vec in dependencies

  return (
    <RigidBody
      linearDamping={2}  
      angularDamping={0.5}  
      friction={0.1}
      restitution={0.9}
      position={pos}
      ref={api}
      colliders={false}
      canSleep={false}  
    >
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      {children ? children : <Model {...props} />}
      {accent && <pointLight intensity={3} distance={3} color={props.color} decay={2} />}
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()
  
  useFrame(({ mouse, viewport }) => {
    ref.current?.setNextKinematicTranslation(vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0))
  })
  
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.4]} /> {/* Softer push */}
    </RigidBody>
  )
}

function Model({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  const { nodes } = useGLTF('/c-transformed.glb')

  useFrame((state, delta) => {
    // Instant color change: directly set the color
    if (ref.current && ref.current.material) {
      ref.current.material.color.set(color);
    }
  })

  return (
    <mesh
      ref={ref}
      castShadow       // This object casts a shadow
      receiveShadow    // This object receives shadows (including from itself)
      scale={10}
      geometry={nodes.connector.geometry}
    >
      <meshPhysicalMaterial
        clearcoat={clearcoat}
        clearcoatRoughness={0.1}
        metalness={metalness}
        roughness={roughness}
        reflectivity={0.6}
      />
    </mesh>
  )
}
