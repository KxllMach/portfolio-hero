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

    // ORIGINAL CENTERING FORCE - Keep this exactly as it was
    const forceMultiplier = 0.4
    let inward = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    // SEPARATE GYROSCOPE GRAVITY - Only modify the centering target, not add to impulse
    if (isSupported && permission === 'granted') {
      const maxTilt = 30 // degrees
      const gyroStrength = 0.15
      
      const normalizedGamma = Math.max(-1, Math.min(1, orientation.gamma / maxTilt))
      const normalizedBeta = Math.max(-1, Math.min(1, orientation.beta / maxTilt))
      
      // Modify the centering force direction, not add impulses
      inward.x += -normalizedGamma * gyroStrength
      inward.y += normalizedBeta * gyroStrength
    }

    // Apply ONLY the centering force - no separate gyro impulses
    api.current.applyImpulse(inward, true)

    // Original torque
    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
  })

  // SEPARATE CLICK IMPULSE - Keep completely isolated from gyro
  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation()
      vec.set(currentPosition.x, currentPosition.y, currentPosition.z)
      vec.normalize()
      vec.multiplyScalar(50)
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
  const targetPosition = useRef({ x: 0, y: 0, z: 15 })
  const targetRotation = useRef({ x: 0, y: 0, z: 0 })
  
  useFrame((state) => {
    if (!isSupported || permission !== 'granted') return
    const { beta, gamma, alpha } = orientation
    const cam = state.camera
    
    // IMPROVED CAMERA PANNING - More responsive and natural
    const cameraStrength = 0.8  // Increased for more noticeable effect
    const maxCameraTilt = 25    // Increased range
    const lerpSpeed = 0.08      // Faster response
    
    // Clamp gyroscope values
    const clampedGamma = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, gamma))
    const clampedBeta = Math.max(-maxCameraTilt, Math.min(maxCameraTilt, beta))
    const clampedAlpha = alpha || 0
    
    // Calculate target position based on gyro
    targetPosition.current.x = clampedGamma * cameraStrength
    targetPosition.current.y = -clampedBeta * cameraStrength
    targetPosition.current.z = 15 + Math.sin(clampedAlpha * Math.PI / 180) * 0.5 // Subtle depth with compass
    
    // Calculate target rotation for more dynamic camera
    targetRotation.current.x = clampedBeta * 0.002  // Subtle pitch
    targetRotation.current.y = clampedGamma * 0.001 // Subtle yaw
    targetRotation.current.z = clampedGamma * 0.001 // Subtle roll for natural feel
    
    // Smooth lerp to target position
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetPosition.current.x, lerpSpeed)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetPosition.current.y, lerpSpeed)
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetPosition.current.z, lerpSpeed * 0.5) // Slower Z movement
    
    // Apply subtle rotation
    cam.rotation.x = THREE.MathUtils.lerp(cam.rotation.x, targetRotation.current.x, lerpSpeed)
    cam.rotation.y = THREE.MathUtils.lerp(cam.rotation.y, targetRotation.current.y, lerpSpeed)
    cam.rotation.z = THREE.MathUtils.lerp(cam.rotation.z, targetRotation.current.z, lerpSpeed)
    
    // Still look at center but with slight offset based on tilt
    const lookAtOffset = {
      x: clampedGamma * 0.05,
      y: -clampedBeta * 0.05,
      z: 0
    }
    cam.lookAt(lookAtOffset.x, lookAtOffset.y, lookAtOffset.z)
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
