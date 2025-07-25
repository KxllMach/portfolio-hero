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
  
  // Dynamic quality detection for mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isPortrait = window.innerHeight > window.innerWidth;
  
  // Force landscape canvas dimensions for better GPU performance
  const canvasStyle = useMemo(() => {
    if (isMobile && isPortrait) {
      const canvasWidth = Math.max(window.innerWidth, window.innerHeight);
      const canvasHeight = Math.min(window.innerWidth, window.innerHeight);
      return {
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: `-${canvasHeight / 2}px`,
        marginLeft: `-${canvasWidth / 2}px`
      };
    }
    return {};
  }, [isMobile, isPortrait]);
  
  const connectors = useMemo(() => shuffle(accent), [accent])

  // Handle canvas click: change accent and trigger impulse - optimized with useCallback
  const handleCanvasClick = useCallback(() => {
    click(); // Change color accent
    setTriggerImpulse(prev => prev + 1); // Increment to trigger impulse
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Canvas
        onClick={handleCanvasClick}
        style={canvasStyle}
        dpr={isMobile ? [0.8, 1.2] : [1, 1.5]}
        gl={{ 
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          toneMapping: THREE.NoToneMapping,
          alpha: false,
          depth: true,
          preserveDrawingBuffer: false,
        }}
        camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
      >
      <color attach="background" args={['#151615']} />
      
      {/* Simplified lighting setup - less realistic, better performance */}
      <ambientLight intensity={1.2} /> {/* Increased ambient to reduce shadows */}
      
      {/* Single directional light instead of spotlight - no shadows */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.8}
        castShadow={false} // Disabled shadows for major performance boost
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

      {/* Simplified post-processing */}
      <EffectComposer 
        disableNormalPass 
        multisampling={isMobile ? 0 : 1}
      >
        <N8AO 
          distanceFalloff={2} 
          aoRadius={0.5}
          intensity={2}
          samples={isMobile ? 4 : 8}
        />
      </EffectComposer>

      {/* Simplified environment - much less realistic lighting */}
      <Environment resolution={16}> {/* Heavily reduced from 32 */}
        <group rotation={[-Math.PI / 3, 0, 1]}>
          {/* Reduced to just 2 lightformers with lower intensity */}
          <Lightformer form="circle" intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={1.5} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
        </group>
      </Environment>
    </Canvas>
    </div>
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
      restitution={0.7}
      position={pos}
      ref={api}
      colliders={false}
      canSleep={false}  
    >
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      {children ? children : <Model {...props} />}
      {/* Reduced accent light intensity and distance */}
      {accent && <pointLight intensity={1.5} distance={2} color={props.color} decay={2} />}
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
      castShadow={false}    // Disabled shadow casting for better performance
      receiveShadow={false} // Disabled shadow receiving for better performance
      scale={10}
      geometry={nodes.connector.geometry}
    >
      <meshPhysicalMaterial
        clearcoat={clearcoat}
        clearcoatRoughness={0.1}
        metalness={metalness}
        roughness={roughness}
        reflectivity={0.3} // Reduced from 0.6 for less shine
      />
    </mesh>
  )
}
