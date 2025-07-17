import * as THREE from 'three'
import { useRef, useReducer, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { easing } from 'maath'

// 🎨 Accent colors
const accents = ['#4060ff', '#20ffa0', '#ff4060', '#ffcc00']

// Shuffle with individual clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0, clearcoat: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: '#444', roughness: 0.75, metalness: 0.2, clearcoat: 0.8 },
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 0.5 },
  { color: 'white', roughness: 0.75, metalness: 0.0.2, clearcoat: 1 },
  { color: 'white', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, clearcoat: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const connectors = useMemo(() => shuffle(accent), [accent])

  return (
    <Canvas
      onClick={click}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: false }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
    >
      {/* Dark background */}
      <color attach="background" args={['#151615']} />

      {/* Brighter lighting */}
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

      <Physics gravity={[0, 0, 0]} maxSubSteps={3}>
        <Pointer />
        {connectors.map((props, i) => <Connector key={i} {...props} />)}
      </Physics>

      {/* AO for depth */}
      <EffectComposer disableNormalPass multisampling={4}>
        <N8AO distanceFalloff={1} aoRadius={1} intensity={3.5} />
      </EffectComposer>

      {/* Environment lighting */}
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

function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [])

  useFrame((state, delta) => {
    delta = Math.min(0.05, delta)
    api.current?.applyImpulse(vec.copy(api.current.translation()).negate().multiplyScalar(0.15))
  })

  return (
    <RigidBody linearDamping={4} angularDamping={1} friction={0.1} position={pos} ref={api} colliders={false}>
      <CuboidCollider args={[0.38, 1.27, 0.38]} />
      <CuboidCollider args={[1.27, 0.38, 0.38]} />
      <CuboidCollider args={[0.38, 0.38, 1.27]} />
      {children ? children : <Model {...props} />}
      {accent && <pointLight intensity={3} distance={3} color={props.color} />}
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
      <BallCollider args={[1]} />
    </RigidBody>
  )
}

function Model({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  const { nodes } = useGLTF('/c-transformed.glb')

  useFrame((state, delta) => {
    easing.dampC(ref.current.material.color, color, 0.2, delta)
  })

  return (
    <mesh ref={ref} castShadow receiveShadow scale={10} geometry={nodes.connector.geometry}>
      <meshPhysicalMaterial
        clearcoat={clearcoat}           // ✅ Now dynamic
        clearcoatRoughness={0.1}
        metalness={metalness}
        roughness={roughness}
        reflectivity={0.6}
      />
    </mesh>
  )
}
