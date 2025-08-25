import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'

// ---------------- Gyroscope Hook ----------------
function useGyroscope() {
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0, alpha: 0 })
  const [permission, setPermission] = useState('unknown')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setIsSupported(true)
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS ≥13 requires user gesture → treat as denied (since no button)
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
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
      frameloop="always"
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} decay={2} />
      <pointLight position={[3, -3, 8]} intensity={0.3} decay={2} />

      <Physics gravity={[0, 0, 0]} maxSubSteps={1} timeStep={1/60}>
        {/* Gyro pointer - much gentler */}
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

      {/* Optional: pan camera with gyro */}
      <CameraGyro orientation={orientation} isSupported={isSupported} permission={permission} />
    </Canvas>
  )
}

// ---------------- Connectors ----------------
function Connector({ position, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, orientation, isSupported, permission, accent, triggerImpulse, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [position])

  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  const oscSpeeds = { x: 0.8, y: 1.0, z: 0.6 }

  useFrame((state, delta) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()
    const currentPosition = api.current.translation()

    // Base centering force
    const forceMultiplier = 0.4
    let centeringForce = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    // GENTLE GYROSCOPE GRAVITY - Instead of impulses, modify the centering force
    if (isSupported && permission === 'granted') {
      // Clamp gyroscope values to reasonable ranges and apply smoothly
      const maxTilt = 30 // degrees - anything beyond this is clamped
      const gyroStrength = 0.15 // Much gentler than before
      
      // Normalize tilt values to -1 to 1 range, clamped to maxTilt
      const normalizedGamma = Math.max(-1, Math.min(1, orientation.gamma / maxTilt))
      const normalizedBeta = Math.max(-1, Math.min(1, orientation.beta / maxTilt))
      
      // Apply as gentle "gravity" offset to the centering point
      centeringForce.x += -normalizedGamma * gyroStrength
      centeringForce.y += normalizedBeta * gyroStrength
    }

    // Apply the combined force as a gentle impulse
    api.current.applyImpulse(centeringForce, true)

    // Gentle torque for rotation
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
  })

  // Click-based impulse (this stays strong for the "explosion" effect)
  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation()
      vec.set(currentPosition.x, currentPosition.y, currentPosition.z)
      vec.normalize()
      vec.multiplyScalar(50) // This stays strong for the click effect
      api.current.applyImpulse(vec, true)
    }
  }, [triggerImpulse, vec])

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

// ---------------- Pointer ----------------
function Pointer({ vec = new THREE.Vector3(), orientation, isSupported, permission }) {
  const ref = useRef()
  useFrame(({ mouse, viewport }) => {
    if (!ref.current) return
    let x = (mouse.x * viewport.width) / 2
    let y = (mouse.y * viewport.height) / 2
    let z = 0

    // MUCH GENTLER pointer movement
    if (isSupported && permission === 'granted') {
      const pointerGyroStrength = 1.5 // Reduced from 3
      const maxTilt = 45 // degrees
      
      // Clamp and apply gyroscope to pointer position
      const clampedGamma = Math.max(-maxTilt, Math.min(maxTilt, orientation.gamma))
      const clampedBeta = Math.max(-maxTilt, Math.min(maxTilt, orientation.beta))
      
      x += (clampedGamma / maxTilt) * pointerGyroStrength
      y += (clampedBeta / maxTilt) * pointerGyroStrength
      
      // Subtle depth based on total tilt
      const totalTilt = Math.abs(clampedGamma) + Math.abs(clampedBeta)
      z = (totalTilt / (maxTilt * 2)) * 0.5 // Much less depth movement
    }

    ref.current.setNextKinematicTranslation(vec.set(x, y, z))
  })

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.4]} />
    </RigidBody>
  )
}

// ---------------- Gyro Camera ----------------
function CameraGyro({ orientation, isSupported, permission }) {
  useFrame((state) => {
    if (!isSupported || permission !== 'granted') return
    const { beta, gamma } = orientation
    const cam = state.camera
    
    // MUCH GENTLER camera movement
    const cameraStrength = 0.2 // Reduced significantly
    const maxCameraTilt = 15 // degrees
    
    // Clamp camera movement
    const clampedGamma = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, gamma))
    const clampedBeta = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, beta))
    
    // Smooth lerp to new position
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, clampedGamma * cameraStrength, 0.03)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, -clampedBeta * cameraStrength, 0.03)
    cam.lookAt(0, 0, 0)
  })
  return null
}

// ---------------- Model ----------------
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
