import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'

// 🎨 Accent colors - moved to module level for better caching
const accents = ['#4060ff', '#8FFE09', '#ED141F', '#fff500']

// Pre-computed material configurations with proper memoization
const createMaterialConfigs = (accent = 0) => [
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

// Preload GLTF model
useGLTF.preload('/c-transformed.glb')

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const [triggerImpulse, setTriggerImpulse] = useState(0)
  
  // Memoize material configurations to prevent recreation
  const connectors = useMemo(() => createMaterialConfigs(accent), [accent])

  // Optimize click handler with useCallback
  const handleCanvasClick = useCallback(() => {
    click()
    setTriggerImpulse(prev => prev + 1)
  }, [])

  // Memoize canvas props
  const canvasProps = useMemo(() => ({
    dpr: [1, 1.5],
    gl: { 
      antialias: false,
      powerPreference: "high-performance", // Request high-performance GPU
      stencil: false, // Disable stencil buffer if not needed
      depth: true,
      alpha: false // Disable alpha if background is opaque
    },
    camera: { position: [0, 0, 15], fov: 17.5, near: 1, far: 20 },
    frameloop: 'demand' // Only render when needed
  }), [])

  return (
    <Canvas
      onClick={handleCanvasClick}
      {...canvasProps}
    >
      <color attach="background" args={['#151615']} />
      
      {/* Optimized lighting setup */}
      <OptimizedLighting />
      
      <Physics 
        gravity={[0, 0, 0]} 
        maxSubSteps={2} // Reduced from 3 for better performance
        substepCount={1}
        timeStep={1/60}
      >
        <Pointer />
        {connectors.map((props, i) => (
          <Connector 
            key={`${accent}-${i}`} // Better key for React reconciliation
            triggerImpulse={triggerImpulse} 
            index={i}
            {...props} 
          />
        ))}
      </Physics>

      {/* Optimized post-processing */}
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

      {/* Cached environment */}
      <OptimizedEnvironment />
    </Canvas>
  )
}

// Memoized lighting component
const OptimizedLighting = React.memo(() => (
  <>
    <ambientLight intensity={0.8} />
    <spotLight 
      position={[10, 10, 10]} 
      angle={0.15} 
      penumbra={1} 
      intensity={2} 
      castShadow
      shadow-mapSize={[256, 256]} // Reduced shadow resolution for better performance
      shadow-camera-fov={15}
      shadow-camera-near={1}
      shadow-camera-far={20}
    />
  </>
))

// Memoized environment component
const OptimizedEnvironment = React.memo(() => (
  <Environment resolution={128}> {/* Reduced resolution for better performance */}
    <group rotation={[-Math.PI / 3, 0, 1]}>
      <Lightformer form="circle" intensity={6} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
      <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
      <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
      <Lightformer form="circle" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
    </group>
  </Environment>
))

function Connector({ 
  position, 
  children, 
  accent, 
  triggerImpulse, 
  index,
  ...props 
}) {
  const api = useRef()
  
  // Cache expensive calculations
  const cached = useMemo(() => {
    const r = THREE.MathUtils.randFloatSpread
    return {
      pos: position || [r(10), r(10), r(10)],
      vec: new THREE.Vector3(),
      offset: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2
      },
      // Pre-calculate oscillation multipliers
      oscX: 0.8 + Math.random() * 0.4, // Vary oscillation speed
      oscY: 1.0 + Math.random() * 0.4,
      oscZ: 0.6 + Math.random() * 0.4
    }
  }, [position, index]) // Include index to ensure unique values per connector

  // Optimize animation loop with reduced calculations
  useFrame((state) => {
    if (!api.current) return
    
    const t = state.clock.getElapsedTime()
    const currentPosition = api.current.translation()

    // Batch calculations
    const inwardForce = 0.4
    const inward = {
      x: -currentPosition.x * inwardForce + Math.sin(t * cached.oscX + cached.offset.x) * 0.1,
      y: -currentPosition.y * inwardForce + Math.cos(t * cached.oscY + cached.offset.y) * 0.1,
      z: -currentPosition.z * inwardForce + Math.sin(t * cached.oscZ + cached.offset.z) * 0.05
    }

    // Apply forces in single call
    api.current.applyImpulse(inward, true)

    // Reduced torque calculations
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + cached.offset.x) * torqueStrength,
      y: Math.cos(t + cached.offset.y) * torqueStrength,
      z: Math.sin(t + cached.offset.z) * torqueStrength
    }, true)
  })

  // Optimize impulse effect
  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation()
      
      // Reuse cached vector for better memory management
      cached.vec.set(currentPosition.x, currentPosition.y, currentPosition.z)
      cached.vec.normalize().multiplyScalar(50)
      
      api.current.applyImpulse(cached.vec, true)
    }
  }, [triggerImpulse, cached.vec])

  // Memoize collider configuration
  const colliderProps = useMemo(() => ({
    linearDamping: 2,  
    angularDamping: 0.5,  
    friction: 0.1,
    restitution: 0.9,
    position: cached.pos,
    colliders: false,
    canSleep: false
  }), [cached.pos])

  return (
    <RigidBody ref={api} {...colliderProps}>
      {/* Use shared collider geometry */}
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      
      {children || <OptimizedModel {...props} />}
      
      {accent && (
        <pointLight 
          intensity={3} 
          distance={3} 
          color={props.color}
          decay={2} // Add realistic light decay
        />
      )}
    </RigidBody>
  )
}

// Memoized pointer component
const Pointer = React.memo(() => {
  const ref = useRef()
  const vec = useMemo(() => new THREE.Vector3(), [])
  
  useFrame(({ mouse, viewport }) => {
    ref.current?.setNextKinematicTranslation(
      vec.set(
        (mouse.x * viewport.width) / 2, 
        (mouse.y * viewport.height) / 2, 
        0
      )
    )
  })
  
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.4]} />
    </RigidBody>
  )
})

// Heavily optimized model component
function OptimizedModel({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  const materialRef = useRef()
  const { nodes } = useGLTF('/c-transformed.glb')
  
  // Create material once and reuse
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    clearcoat,
    clearcoatRoughness: 0.1,
    metalness,
    roughness,
    reflectivity: 0.6
  }), [clearcoat, metalness, roughness])

  // Optimize color updates with direct material reference
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.color.set(color)
    }
  })

  // Clone geometry once for better memory usage
  const geometry = useMemo(() => {
    if (nodes?.connector?.geometry) {
      return nodes.connector.geometry.clone()
    }
    return new THREE.BoxGeometry(1, 1, 1) // Fallback
  }, [nodes])

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      scale={10}
      geometry={geometry}
      material={material}
      onBeforeRender={() => {
        materialRef.current = material
      }}
    />
  )
}
