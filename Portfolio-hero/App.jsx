import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'

// ---------------- Gyroscope Hook (No changes needed here) ----------------
function useGyroscope() {
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0, alpha: 0 })
  const [permission, setPermission] = useState('unknown')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setIsSupported(true)
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS ≥13 requires user gesture. We'll assume for this app
        // you'd have a button to trigger this, but for now, we'll leave it.
        // For simplicity, let's treat it as denied until a user action.
        setPermission('denied') 
      } else {
        setPermission('granted')
        startListening()
      }
    } else {
      setIsSupported(false)
      setPermission('denied')
    }

    function startListening() {
      const handleOrientation = (event) => {
        const beta = event.beta ?? 0
        const gamma = event.gamma ?? 0
        const alpha = event.alpha ?? 0
        setOrientation({ beta, gamma, alpha })
      }

      window.addEventListener('deviceorientation', handleOrientation, { passive: true })
      return () => window.removeEventListener('deviceorientation', handleOrientation)
    }

    if (permission === 'granted') {
      return startListening()
    }
  }, [permission])

  return { orientation, permission, isSupported }
}

// 🎨 Accent colors
const accents = ['#4060ff', '#8FFE09', '#ED141F', '#fff500']

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
  const [triggerImpulse, setTriggerImpulse] = useState(0)

  const { orientation, permission, isSupported } = useGyroscope()
  const connectors = useMemo(() => shuffle(accent), [accent])

  const handleCanvasClick = useCallback(() => {
    click()
    setTriggerImpulse(prev => prev + 1)
  }, [])

  return (
    <Canvas
      onClick={handleCanvasClick}
      dpr={[1, 1.25]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        alpha: false,
        preserveDrawingBuffer: false,
        premultipliedAlpha: false,
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 40 }} // Increased 'far' plane
      frameloop="always"
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} decay={2} />
      <pointLight position={[3, -3, 8]} intensity={0.3} decay={2} />

      <Physics gravity={[0, 0, 0]} maxSubSteps={1} timeStep={1/60}>
        <Pointer orientation={orientation} isSupported={isSupported} permission={permission} />
        {connectors.map((props, i) => (
          <Connector
            key={i}
            triggerImpulse={triggerImpulse}
            orientation={orientation}
            isSupported={isSupported}
            permission={permission}
            {...props}
          />
        ))}
      </Physics>

      <Environment resolution={16}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={1.5} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
          <Lightformer form="ring" intensity={0.8} rotation-y={Math.PI / 2} position={[-10, 2, 0]} scale={4} />
        </group>
      </Environment>
      
      <CameraGyro orientation={orientation} isSupported={isSupported} permission={permission} />
    </Canvas>
  )
}

// ---------------- Connectors (FIXED) ----------------
function Connector({ position, r = THREE.MathUtils.randFloatSpread, orientation, isSupported, permission, accent, triggerImpulse, ...props }) {
  const api = useRef()
  // This vector is now created once and will not change on re-renders
  const vec = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [position, r])

  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  const oscSpeeds = { x: 0.8, y: 1.0, z: 0.6 }

  useFrame((state) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()
    const currentPosition = api.current.translation()
    
    // Centering and oscillating force
    const forceMultiplier = 0.4
    let inward = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    // Gyroscope gravity influence
    if (isSupported && permission === 'granted') {
      const maxTilt = 30
      const gyroStrength = 0.3
      const normalizedGamma = Math.max(-1, Math.min(1, orientation.gamma / maxTilt))
      const normalizedBeta = Math.max(-1, Math.min(1, orientation.beta / maxTilt))
      inward.x += -normalizedGamma * gyroStrength
      inward.y += normalizedBeta * gyroStrength
    }
    
    api.current.applyImpulse(inward, true)

    // Torque for rotation
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
  })

  // Click impulse effect
  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation()
      vec.set(currentPosition.x, currentPosition.y, currentPosition.z).normalize().multiplyScalar(50)
      api.current.applyImpulse(vec, true)
    }
  // The dependency array is now correct. It only triggers when the click count changes.
  }, [triggerImpulse]) // <-- CRITICAL FIX: Removed 'vec' from dependencies

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
      <Model {...props} />
    </RigidBody>
  )
}

// ---------------- Pointer (No changes needed here) ----------------
function Pointer({ vec = new THREE.Vector3(), orientation, isSupported, permission }) {
  const ref = useRef()
  useFrame(({ mouse, viewport }) => {
    if (!ref.current) return
    let x = (mouse.x * viewport.width) / 2
    let y = (mouse.y * viewport.height) / 2
    let z = 0

    if (isSupported && permission === 'granted') {
      const pointerGyroStrength = 1.5
      const maxTilt = 45
      const clampedGamma = Math.max(-maxTilt, Math.min(maxTilt, orientation.gamma))
      const clampedBeta = Math.max(-maxTilt, Math.min(maxTilt, orientation.beta))
      x += (clampedGamma / maxTilt) * pointerGyroStrength
      y += (clampedBeta / maxTilt) * pointerGyroStrength
      const totalTilt = Math.abs(clampedGamma) + Math.abs(clampedBeta)
      z = (totalTilt / (maxTilt * 2)) * 0.5
    }

    ref.current.setNextKinematicTranslation(vec.set(x, y, z))
  })

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.4]} />
    </RigidBody>
  )
}

// ---------------- Gyro Camera (FIXED) ----------------
function CameraGyro({ orientation, isSupported, permission }) {
  useFrame((state) => {
    if (!isSupported || permission !== 'granted') return
    const { beta, gamma } = orientation
    const cam = state.camera

    // Reduced strength for much more subtle panning
    const cameraStrength = 0.2
    const maxCameraTilt = 20 // Reduced range for less travel
    const lerpSpeed = 0.06 // Slightly slower for a smoother feel

    // Clamp gyroscope values
    const clampedGamma = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, gamma))
    const clampedBeta = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, beta))

    // Calculate target position based on gyro
    const targetX = clampedGamma * cameraStrength
    const targetY = -clampedBeta * cameraStrength
    
    // Smoothly interpolate (lerp) the camera's position towards the target
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX, lerpSpeed)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY, lerpSpeed)

    // ALWAYS look at the center of the scene for stability
    cam.lookAt(0, 0, 0)
  })
  return null
}

// ---------------- Model (No changes needed here) ----------------
function Model({ color = 'white', roughness = 0.2, metalness = 0.5 }) {
  const ref = useRef()
  const { nodes } = useGLTF('/c-transformed.glb')

  useFrame(() => {
    if (ref.current && ref.current.material) {
      ref.current.material.color.set(color)
    }
  })

  return (
    <mesh ref={ref} scale={10} geometry={nodes.connector.geometry}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={0.5} />
    </mesh>
  )
}
