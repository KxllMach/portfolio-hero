import * as THREE from 'three'
import { useRef, useReducer, useMemo } from 'react' // Removed Suspense
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier' // Removed ConvexHullCollider
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { easing } from 'maath'

// 🎨 Accent colors
const accents = ['#4060ff', '#20ffa0', '#ff4060', '#ffcc00']

// Shuffle with clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0, clearcoat: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.8, clearcoat: 1 },
  { color: '#444', roughness: 0.75, metalness: 0.2, clearcoat: 0.8 },
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 0.5 },
  { color: 'white', roughness: 0.75, metalness: 0.8, clearcoat: 1 },
  { color: 'white', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, clearcoat: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.8, clearcoat: 1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const connectors = useMemo(() => shuffle(accent), [accent])

  // Removed useGLTF('/c-transformed.glb') from App level

  return (
    <Canvas
      onClick={click}
      dpr={[1, 1.5]}
      gl={{ antialias: false }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={0.8} />

      {/* SpotLight configured for focused shadows */}
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow>
        {/* Configure the shadow camera to tightly encompass the objects */}
        <perspectiveCamera
          attach="shadow-camera"
          args={[
            15, // fov: Narrower FOV to focus the shadow map on the objects
            1,  // aspect: Keep it 1 for square shadow map
            1,  // near: Adjust to clip very close objects if needed
            20  // far: Adjust to include relevant objects without wasting resolution
          ]}
        />
        {/* Shadow map resolution: Higher for sharper shadows, lower for more performance */}
        {/* Using 512x512 for a balance, can go lower for more performance or higher for more quality */}
        <bufferAttribute attach="shadow.mapSize" array={new Float32Array([512, 512])} itemSize={2} />
      </spotLight>

      {/* Removed Suspense, as Model now handles its own loading */}
      <Physics gravity={[0, 0, 0]} maxSubSteps={3}>
        <Pointer />
        {/* No longer passing modelGeometry prop */}
        {connectors.map((props, i) => <Connector key={i} {...props} />)}
      </Physics>

      <EffectComposer disableNormalPass multisampling={4}>
        <N8AO distanceFalloff={1} aoRadius={1} intensity={3.5} />
      </EffectComposer>

      <Environment resolution={256}>
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

// No longer accepting modelGeometry as a prop
function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [])

  // Random offsets for individual oscillation
  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  useFrame((state, delta) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()

    // Get current position
    const position = api.current.translation()

    // Strong inward pull to center
    const inward = {
      x: -position.x * 0.1,
      y: -position.y * 0.1,
      z: -position.z * 0.1
    }

    // Add oscillation per object (increased magnitude slightly for better motion with damping)
    inward.x += Math.sin(t * 0.8 + offset.x) * 0.1
    inward.y += Math.cos(t * 1.0 + offset.y) * 0.1
    inward.z += Math.sin(t * 0.6 + offset.z) * 0.05

    // Apply impulse and explicitly wake up the body
    api.current.applyImpulse(inward, true)

    // Add small torque for random rotation (increased magnitude slightly)
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * 0.001,
      y: Math.cos(t + offset.y) * 0.001,
      z: Math.sin(t + offset.z) * 0.001
    }, true)
  })

  return (
    <RigidBody
      linearDamping={2}    // Reverted to original linear damping
      angularDamping={0.2}
      friction={0.1}
      restitution={0.8}    // Kept restitution at 0.8
      position={pos}
      ref={api}
      colliders={false} // Still set to false as we're providing custom colliders
      canSleep={false}
    >
      {/* Reverted to the three CuboidColliders */}
      <CuboidCollider args={[0.38, 1.27, 0.38]} />
      <CuboidCollider args={[1.27, 0.38, 0.38]} />
      <CuboidCollider args={[0.38, 0.38, 1.27]} />
      
      {/* No longer passing modelGeometry to Model */}
      {children ? children : <Model {...props} />}
      {accent && <pointLight intensity={3} distance={3} color={props.color} />}
    </RigidBody>
  )
}

// No longer accepting modelGeometry as a prop
function Model({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  // useGLTF is back here for Model to load its own geometry
  const { nodes } = useGLTF('/c-transformed.glb') 

  useFrame((state, delta) => {
    easing.dampC(ref.current.material.color, color, 0.2, delta)
  })

  return (
    <mesh
      ref={ref}
      castShadow       // This object casts a shadow
      receiveShadow    // This object receives shadows (including from itself)
      scale={10}
      geometry={nodes.connector.geometry} // Use geometry from local useGLTF
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
